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
    const system = this.renderer.render(prompt.template, {
      bot_name: bot.name ?? '',
      rag_context: contexts.map((c) => c.content).join('\n---\n'),
      user_message: userText,
    });

    const history = await this.messages.lastN(conversation.id, 10);
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
