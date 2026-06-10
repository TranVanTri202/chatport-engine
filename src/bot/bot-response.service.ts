import { Injectable, Logger } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { Bot } from '@prisma/client';
import { ChannelType, MessageType, ThreadType } from '@/shared/types';
import { AppConfig } from '@/shared/config/app.config';
import { RedisService } from '@/shared/redis/redis.service';
import {
  DOMAIN_EVENTS,
  MessageReceivedEvent,
} from '@/shared/events/domain-events';
import { QuotaExceededError } from '@/shared/errors/quota.errors';
import { MessagingPublisher } from '@/messaging/messaging.publisher';
import { ReplyPolicyService } from '@/messaging/reply-policy.service';
import { MessageService } from '@/conversations/message.service';
import { ConversationService } from '@/conversations/conversation.service';
import { RetrievalService, RetrievedChunk } from '@/rag/retrieval.service';
import { LlmService } from '@/llm/llm.service';
import { LlmCallOverrides } from '@/llm/llm-settings';
import { QuotaService } from '@/quota/quota.service';

/** Max auto-replies per conversation per window. Prevents spam loops. */
const REPLY_RATE_WINDOW_SEC = 60;
const REPLY_RATE_MAX = 5;

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
    private readonly retrieval: RetrievalService,
    private readonly llm: LlmService,
    private readonly config: AppConfig,
    private readonly policy: ReplyPolicyService,
    private readonly quota: QuotaService,
    private readonly redis: RedisService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private isWithinActiveHours(hoursStr: string | null): boolean {
    if (!hoursStr || hoursStr.trim() === '' || hoursStr === '24/7') return true;
    try {
      const cleaned = hoursStr.replace(/\s+/g, '');
      const parts = cleaned.split('-');
      if (parts.length !== 2) return true;
      const [startStr, endStr] = parts;
      
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      
      const parseTimeToMinutes = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
      };
      
      const startMinutes = parseTimeToMinutes(startStr);
      const endMinutes = parseTimeToMinutes(endStr);
      
      if (startMinutes <= endMinutes) {
        return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
      } else {
        // Overnight hours, e.g. "22:00-06:00"
        return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
      }
    } catch (err) {
      return true;
    }
  }

  @OnEvent(DOMAIN_EVENTS.MessageReceived, { async: true, promisify: true })
  async onMessageReceived(event: MessageReceivedEvent): Promise<void> {
    const { bot, conversation, inbound } = event;

    if (bot.status !== 'active') return;
    if (!bot.autoReplyEnabled) return;
    if (!conversation.autoReplyEnabled) return;
    if (!this.policy.shouldConsider({ bot, conversation, inbound })) return;

    // Per-conversation rate limit: prevent reply spam loops
    const rateLimitKey = `ratelimit:reply:${conversation.id}`;
    const allowed = await this.redis.checkRateLimit(
      rateLimitKey,
      REPLY_RATE_WINDOW_SEC,
      REPLY_RATE_MAX,
    );
    if (!allowed) {
      this.logger.warn(
        `Rate limit hit for conversation ${conversation.id}: ${REPLY_RATE_MAX}/${REPLY_RATE_WINDOW_SEC}s`,
      );
      return;
    }

    // Check active hours
    if (!this.isWithinActiveHours(bot.activeHours)) {
      if (bot.fallbackReplies && bot.fallbackReplies.length > 0) {
        const randomIndex = Math.floor(Math.random() * bot.fallbackReplies.length);
        const replyText = bot.fallbackReplies[randomIndex];

        await this.publisher.publishOutbound({
          botId: bot.id,
          channel: bot.channel as ChannelType,
          botExternalId: bot.externalId,
          threadId: conversation.threadExternalId,
          threadType: conversation.threadType as ThreadType,
          type: MessageType.webchat,
          text: replyText,
        });
      }
      return;
    }

    if (bot.channel === 'zalo') {
      this.eventEmitter.emit('bot.typing', {
        botExternalId: bot.externalId,
        threadId: conversation.threadExternalId,
        threadType: conversation.threadType,
        isTyping: true,
      });
    }

    try {
      const userText = inbound.text!.trim();
      const result = await this.generateReply(bot, conversation, userText);
      if (!result) return;

      await this.publisher.publishOutbound({
        botId: bot.id,
        channel: bot.channel as ChannelType,
        botExternalId: bot.externalId,
        threadId: conversation.threadExternalId,
        threadType: conversation.threadType as ThreadType,
        type: MessageType.webchat,
        text: result.reply,
      });
    } catch (err) {
      if (err instanceof QuotaExceededError) {
        this.logger.warn(
          `Bot ${bot.id} request quota exhausted (${err.used}/${err.limit}); skipping auto-reply`,
        );
        return;
      }
      throw err;
    } finally {
      if (bot.channel === 'zalo') {
        this.eventEmitter.emit('bot.typing', {
          botExternalId: bot.externalId,
          threadId: conversation.threadExternalId,
          threadType: conversation.threadType,
          isTyping: false,
        });
      }
    }
  }

  /**
   * Public helper to run the standardized RAG context lookup, rolling summary
   * updates, system prompt template interpolation, and LLM chat call.
   * Shared between the production auto-reply listener and the demo chat endpoint.
   */
  async generateReply(
    bot: Bot,
    conversation: { id: number; name?: string | null },
    userText: string,
  ): Promise<{ reply: string; contexts: any[] } | null> {
    const systemPrompt = bot.systemPrompt?.trim();
    if (!systemPrompt) return null;

    // Quota check — can throw QuotaExceededError
    await this.quota.consumeRequest(bot.id);

    try {
      // RAG retrieval with timeout — fall back to no context if slow
      const topK = bot.ragTopK ?? this.config.ragTopKDefault;
      const RAG_TIMEOUT_MS = 3_000;
      let contexts: RetrievedChunk[] = [];
      try {
        contexts = await Promise.race([
          this.retrieval.search(bot.id, userText, topK),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('RAG_TIMEOUT')), RAG_TIMEOUT_MS),
          ),
        ]);
      } catch (ragErr) {
        if ((ragErr as Error).message === 'RAG_TIMEOUT') {
          this.logger.warn(
            `RAG search timed out (${RAG_TIMEOUT_MS}ms) for bot ${bot.id}, continuing without context`,
          );
        } else {
          throw ragErr;
        }
      }

      const historyLimit = this.config.conversationHistoryLimit;
      const recentLimit = this.config.conversationRecentLimit;
      const summaryTriggerLimit = this.config.conversationSummaryTriggerLimit;
      const summaryMaxChars = this.config.conversationSummaryMaxChars;

      const history = await this.messages.lastN(conversation.id, historyLimit);
      if (history.length === 0) {
        await this.quota.refundRequest(bot.id);
        return null;
      }

      // The last message is the current user message (already persisted in DB)
      const currentMessage = history[history.length - 1]!;
      const olderHistory = history.slice(0, -1);

      const recentMessages = olderHistory.slice(-recentLimit);
      const olderMessages = olderHistory.slice(
        0,
        Math.max(0, olderHistory.length - recentMessages.length),
      );
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

      const ragContext = this.retrieval.formatContext(contexts);

      const conversationState = this.buildConversationState({
        botName: bot.name ?? '',
        userText,
        ragContext,
        recentHistory,
        summary,
      });

      const system = this.interpolateSystemPrompt(systemPrompt, conversationState);

      // If summary exists, only send recent history + current user message.
      // If no summary exists, send all history (olderHistory + currentMessage = history).
      const activeMessages = summary ? recentMessages : olderHistory;
      const chatHistory = [...activeMessages, currentMessage];

      const messages = chatHistory.map((m) => ({
        role: m.direction === 'out' ? ('assistant' as const) : ('user' as const),
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
    } catch (err) {
      await this.quota.refundRequest(bot.id).catch((refundErr) => {
        this.logger.error(`Failed to refund quota for bot ${bot.id}: ${refundErr.message}`);
      });
      throw err;
    }
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

  private interpolateSystemPrompt(template: string, state: Record<string, string>): string {
    return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key: string) => state[key] ?? '');
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
