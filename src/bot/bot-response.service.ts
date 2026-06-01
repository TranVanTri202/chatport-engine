import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Bot } from '@prisma/client';
import { ChannelType, ThreadType } from '@/shared/types';
import { AppConfig } from '@/shared/config/app.config';
import {
  DOMAIN_EVENTS,
  MessageReceivedEvent,
} from '@/shared/events/domain-events';
import { QuotaExceededError } from '@/shared/errors/quota.errors';
import { MessagingPublisher } from '@/messaging/messaging.publisher';
import { ReplyPolicyService } from '@/messaging/reply-policy.service';
import { MessageService } from '@/conversations/message.service';
import { ConversationService } from '@/conversations/conversation.service';
import { PromptService } from '@/prompts/prompt.service';
import { PromptRendererService } from '@/prompts/prompt-renderer.service';
import { RetrievalService } from '@/rag/retrieval.service';
import { LlmService } from '@/llm/llm.service';
import { LlmCallOverrides } from '@/llm/llm-settings';
import { QuotaService } from '@/quota/quota.service';

/**
 * Reacts to `message.received` events: decides whether to auto-reply, builds
 * the LLM payload (system prompt with RAG context + last-N history), and
 * enqueues the outbound job.
 *
 * Decoupled from the message handler — adding another listener (audit,
 * analytics, webhook) doesn't touch this class, and removing this class
 * doesn't break inbound persistence.
 */
@Injectable()
export class BotResponseService {
  private readonly logger = new Logger(BotResponseService.name);

  constructor(
    private readonly publisher: MessagingPublisher,
    private readonly messages: MessageService,
    private readonly conversations: ConversationService,
    private readonly prompts: PromptService,
    private readonly renderer: PromptRendererService,
    private readonly retrieval: RetrievalService,
    private readonly llm: LlmService,
    private readonly config: AppConfig,
    private readonly policy: ReplyPolicyService,
    private readonly quota: QuotaService,
  ) {}

  @OnEvent(DOMAIN_EVENTS.MessageReceived, { async: true, promisify: true })
  async onMessageReceived(event: MessageReceivedEvent): Promise<void> {
    const { bot, conversation, inbound } = event;

    if (bot.promptId == null) return;
    if (bot.status !== 'active') return;
    if (!this.policy.shouldConsider({ bot, conversation, inbound })) return;

    const prompt = await this.prompts.get(bot.promptId);
    if (!prompt) return;

    // Quota gate — fail fast before doing any LLM/RAG work. Quota exhaustion
    // on the auto-reply path is a silent skip (we still persisted the
    // inbound message), so the user just won't get a bot answer.
    try {
      await this.quota.consumeRequest(bot.id);
    } catch (err) {
      if (err instanceof QuotaExceededError) {
        this.logger.warn(
          `Bot ${bot.id} request quota exhausted (${err.used}/${err.limit}); skipping auto-reply`,
        );
        return;
      }
      throw err;
    }

    const userText = inbound.text!.trim();
    const topK = bot.ragTopK ?? this.config.ragTopKDefault;
    const contexts = await this.retrieval.search(bot.id, userText, topK);

    const historyLimit = this.config.conversationHistoryLimit;
    const recentLimit = this.config.conversationRecentLimit;
    const summaryTriggerLimit = this.config.conversationSummaryTriggerLimit;
    const summaryMaxChars = this.config.conversationSummaryMaxChars;

    const history = await this.messages.lastN(conversation.id, historyLimit);
    const recentMessages = history.slice(-recentLimit);
    const olderMessages = history.slice(0, Math.max(0, history.length - recentMessages.length));
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

    const system = this.renderer.render(prompt.template, conversationState);

    const messages = history.map((m) => ({
      role: m.direction === 'out' ? ('assistant' as const) : ('user' as const),
      content: m.text ?? '',
    }));

    const reply = await this.llm.chat({
      system,
      messages,
      overrides: this.botOverrides(bot),
    });
    if (!reply) return;

    await this.publisher.publishOutbound({
      botId: bot.id,
      channel: bot.channel as ChannelType,
      botExternalId: bot.externalId,
      threadId: conversation.threadExternalId,
      threadType: conversation.threadType as ThreadType,
      text: reply,
    });
  }

  private buildConversationState(input: {
    botName: string;
    userText: string;
    ragContext: string;
    recentHistory: string;
    summary: string | null;
  }): Record<string, string> {
    return {
      bot_name: input.botName,
      user_message: input.userText,
      rag_context: input.ragContext,
      recent_history: input.recentHistory,
      conversation_summary: input.summary ?? '',
    };
  }

  private async conversationSummary(conversationId: number): Promise<string | null> {
    return this.conversations.getSummary(conversationId);
  }

  private async updateRollingSummary(input: {
    botName: string;
    conversationId: number;
    currentSummary: string | null;
    olderMessages: Array<{ direction: string; text: string | null }>;
    recentMessages: Array<{ direction: string; text: string | null }>;
    maxChars: number;
  }): Promise<string | null> {
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
                role: 'user' as const,
                content: `Current summary:\n${input.currentSummary.trim()}`,
              },
            ]
          : []),
        {
          role: 'user' as const,
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
    if (normalized === input.currentSummary?.trim()) return input.currentSummary;
    await this.conversations.updateContextSnapshot(input.conversationId, normalized);
    return normalized;
  }

  private formatSummaryInput(history: Array<{ direction: string; text: string | null }>): string {
    if (history.length === 0) return '- (none)';
    return history
      .map((m) => `${m.direction === 'out' ? 'ASSISTANT' : 'USER'}: ${m.text ?? ''}`)
      .join('\n');
  }

  private normalizeSummary(summary: string, maxChars: number): string {
    const cleaned = summary.trim().replace(/^['"`]|['"`]$/g, '');
    return cleaned.length > maxChars ? cleaned.slice(0, maxChars).trim() : cleaned;
  }

  private formatRecentHistory(history: Array<{ direction: string; text: string | null }>): string {
    return history
      .map((m) => `${m.direction === 'out' ? 'ASSISTANT' : 'USER'}: ${m.text ?? ''}`)
      .join('\n');
  }

  private botOverrides(bot: Bot): LlmCallOverrides {
    const o: LlmCallOverrides = {};
    if (bot.llmModel != null) o.model = bot.llmModel;
    if (bot.temperature != null) o.temperature = bot.temperature;
    if (bot.maxTokens != null) o.maxTokens = bot.maxTokens;
    if (bot.topP != null) o.topP = bot.topP;
    if (bot.frequencyPenalty != null) o.frequencyPenalty = bot.frequencyPenalty;
    if (bot.presencePenalty != null) o.presencePenalty = bot.presencePenalty;
    return o;
  }
}
