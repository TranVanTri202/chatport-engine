"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var BotResponseService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotResponseService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const types_1 = require("../shared/types");
const app_config_1 = require("../shared/config/app.config");
const domain_events_1 = require("../shared/events/domain-events");
const quota_errors_1 = require("../shared/errors/quota.errors");
const messaging_publisher_1 = require("../messaging/messaging.publisher");
const reply_policy_service_1 = require("../messaging/reply-policy.service");
const message_service_1 = require("../conversations/message.service");
const conversation_service_1 = require("../conversations/conversation.service");
const retrieval_service_1 = require("../rag/retrieval.service");
const llm_service_1 = require("../llm/llm.service");
const quota_service_1 = require("../quota/quota.service");
let BotResponseService = BotResponseService_1 = class BotResponseService {
    publisher;
    messages;
    conversations;
    retrieval;
    llm;
    config;
    policy;
    quota;
    logger = new common_1.Logger(BotResponseService_1.name);
    constructor(publisher, messages, conversations, retrieval, llm, config, policy, quota) {
        this.publisher = publisher;
        this.messages = messages;
        this.conversations = conversations;
        this.retrieval = retrieval;
        this.llm = llm;
        this.config = config;
        this.policy = policy;
        this.quota = quota;
    }
    isWithinActiveHours(hoursStr) {
        if (!hoursStr || hoursStr.trim() === '' || hoursStr === '24/7')
            return true;
        try {
            const cleaned = hoursStr.replace(/\s+/g, '');
            const parts = cleaned.split('-');
            if (parts.length !== 2)
                return true;
            const [startStr, endStr] = parts;
            const now = new Date();
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            const parseTimeToMinutes = (t) => {
                const [h, m] = t.split(':').map(Number);
                return h * 60 + m;
            };
            const startMinutes = parseTimeToMinutes(startStr);
            const endMinutes = parseTimeToMinutes(endStr);
            if (startMinutes <= endMinutes) {
                return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
            }
            else {
                return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
            }
        }
        catch (err) {
            return true;
        }
    }
    async onMessageReceived(event) {
        const { bot, conversation, inbound } = event;
        if (bot.status !== 'active')
            return;
        if (!bot.autoReplyEnabled)
            return;
        if (!conversation.autoReplyEnabled)
            return;
        if (!this.policy.shouldConsider({ bot, conversation, inbound }))
            return;
        if (!this.isWithinActiveHours(bot.activeHours)) {
            if (bot.fallbackReplies && bot.fallbackReplies.length > 0) {
                const randomIndex = Math.floor(Math.random() * bot.fallbackReplies.length);
                const replyText = bot.fallbackReplies[randomIndex];
                await this.publisher.publishOutbound({
                    botId: bot.id,
                    channel: bot.channel,
                    botExternalId: bot.externalId,
                    threadId: conversation.threadExternalId,
                    threadType: conversation.threadType,
                    type: types_1.MessageType.chat,
                    text: replyText,
                });
            }
            return;
        }
        try {
            const userText = inbound.text.trim();
            const result = await this.generateReply(bot, conversation, userText);
            if (!result)
                return;
            await this.publisher.publishOutbound({
                botId: bot.id,
                channel: bot.channel,
                botExternalId: bot.externalId,
                threadId: conversation.threadExternalId,
                threadType: conversation.threadType,
                type: types_1.MessageType.chat,
                text: result.reply,
            });
        }
        catch (err) {
            if (err instanceof quota_errors_1.QuotaExceededError) {
                this.logger.warn(`Bot ${bot.id} request quota exhausted (${err.used}/${err.limit}); skipping auto-reply`);
                return;
            }
            throw err;
        }
    }
    async generateReply(bot, conversation, userText) {
        const systemPrompt = bot.systemPrompt?.trim();
        if (!systemPrompt)
            return null;
        await this.quota.consumeRequest(bot.id);
        try {
            const topK = bot.ragTopK ?? this.config.ragTopKDefault;
            const contexts = await this.retrieval.search(bot.id, userText, topK);
            const historyLimit = this.config.conversationHistoryLimit;
            const recentLimit = this.config.conversationRecentLimit;
            const summaryTriggerLimit = this.config.conversationSummaryTriggerLimit;
            const summaryMaxChars = this.config.conversationSummaryMaxChars;
            const history = await this.messages.lastN(conversation.id, historyLimit);
            if (history.length === 0) {
                await this.quota.refundRequest(bot.id);
                return null;
            }
            const currentMessage = history[history.length - 1];
            const olderHistory = history.slice(0, -1);
            const recentMessages = olderHistory.slice(-recentLimit);
            const olderMessages = olderHistory.slice(0, Math.max(0, olderHistory.length - recentMessages.length));
            const recentHistory = this.formatRecentHistory(recentMessages);
            let summary = await this.conversationSummary(conversation.id);
            if (olderMessages.length >= summaryTriggerLimit) {
                summary = await this.updateRollingSummary({
                    botName: bot.name ?? '',
                    conversationId: conversation.id,
                    currentSummary: summary,
                    olderMessages,
                    recentMessages,
                    maxChars: summaryMaxChars,
                });
            }
            const conversationState = this.buildConversationState({
                botName: bot.name ?? '',
                userText,
                ragContext: contexts.map((c) => c.content).join('\n---\n'),
                recentHistory,
                summary,
            });
            const system = this.interpolateSystemPrompt(systemPrompt, conversationState);
            const activeMessages = summary ? recentMessages : olderHistory;
            const chatHistory = [...activeMessages, currentMessage];
            const messages = chatHistory.map((m) => ({
                role: m.direction === 'out' ? 'assistant' : 'user',
                content: m.text ?? '',
            }));
            const reply = await this.llm.chat({
                system,
                messages,
                overrides: this.botOverrides(bot),
            });
            if (!reply) {
                await this.quota.refundRequest(bot.id);
                return null;
            }
            return { reply, contexts };
        }
        catch (err) {
            await this.quota.refundRequest(bot.id).catch((refundErr) => {
                this.logger.error(`Failed to refund quota for bot ${bot.id}: ${refundErr.message}`);
            });
            throw err;
        }
    }
    buildConversationState(input) {
        return {
            bot_name: input.botName,
            user_message: input.userText,
            rag_context: input.ragContext,
            recent_history: input.recentHistory,
            conversation_summary: input.summary ?? '',
        };
    }
    interpolateSystemPrompt(template, state) {
        return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => state[key] ?? '');
    }
    async conversationSummary(conversationId) {
        return this.conversations.getSummary(conversationId);
    }
    async updateRollingSummary(input) {
        const summary = await this.llm.chat({
            system: [
                'You summarize chat conversations for an assistant.',
                'Keep the summary concise, factual, and useful for future replies.',
                'Do not include verbatim dialogue unless it is a key commitment, preference, or decision.',
                `Limit the final summary to about ${input.maxChars} characters or less.`,
                'Return only the summary text.',
            ].join('\n'),
            messages: [
                ...(input.currentSummary
                    ? [
                        {
                            role: 'user',
                            content: `Current summary:\n${input.currentSummary.trim()}`,
                        },
                    ]
                    : []),
                {
                    role: 'user',
                    content: [
                        `Conversation: ${input.botName}`,
                        'Older messages to fold into the summary:',
                        this.formatSummaryInput(input.olderMessages),
                        'Recent messages to preserve as context:',
                        this.formatSummaryInput(input.recentMessages),
                        'Update the summary so it remains compact and captures only durable facts, goals, preferences, and unresolved topics.',
                    ].join('\n\n'),
                },
            ],
            overrides: { temperature: 0.2 },
        });
        const normalized = this.normalizeSummary(summary, input.maxChars);
        if (normalized === input.currentSummary?.trim())
            return input.currentSummary;
        await this.conversations.updateContextSnapshot(input.conversationId, normalized);
        return normalized;
    }
    formatSummaryInput(history) {
        if (history.length === 0)
            return '- (none)';
        return history
            .map((m) => `${m.direction === 'out' ? 'ASSISTANT' : 'USER'}: ${m.text ?? ''}`)
            .join('\n');
    }
    normalizeSummary(summary, maxChars) {
        const cleaned = summary.trim().replace(/^['"`]|['"`]$/g, '');
        return cleaned.length > maxChars ? cleaned.slice(0, maxChars).trim() : cleaned;
    }
    formatRecentHistory(history) {
        return history
            .map((m) => `${m.direction === 'out' ? 'ASSISTANT' : 'USER'}: ${m.text ?? ''}`)
            .join('\n');
    }
    botOverrides(bot) {
        const o = {};
        if (bot.llmModel != null)
            o.model = bot.llmModel;
        if (bot.temperature != null)
            o.temperature = bot.temperature;
        if (bot.maxTokens != null)
            o.maxTokens = bot.maxTokens;
        if (bot.topP != null)
            o.topP = bot.topP;
        if (bot.frequencyPenalty != null)
            o.frequencyPenalty = bot.frequencyPenalty;
        if (bot.presencePenalty != null)
            o.presencePenalty = bot.presencePenalty;
        return o;
    }
};
exports.BotResponseService = BotResponseService;
__decorate([
    (0, event_emitter_1.OnEvent)(domain_events_1.DOMAIN_EVENTS.MessageReceived, { async: true, promisify: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BotResponseService.prototype, "onMessageReceived", null);
exports.BotResponseService = BotResponseService = BotResponseService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [messaging_publisher_1.MessagingPublisher,
        message_service_1.MessageService,
        conversation_service_1.ConversationService,
        retrieval_service_1.RetrievalService,
        llm_service_1.LlmService,
        app_config_1.AppConfig,
        reply_policy_service_1.ReplyPolicyService,
        quota_service_1.QuotaService])
], BotResponseService);
//# sourceMappingURL=bot-response.service.js.map