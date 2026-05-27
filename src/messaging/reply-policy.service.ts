import { Injectable } from '@nestjs/common';
import { Bot, Conversation } from '@prisma/client';
import { ThreadType } from '@/shared/types';
import { InboundMessageDto } from './dto/inbound-message.dto';

/**
 * Encapsulates "should this bot auto-reply to this inbound message?".
 * Lives outside BotResponseService so the handler can short-circuit cheaply
 * before doing any LLM/RAG work, and so the rule is unit-testable in isolation.
 */
@Injectable()
export class ReplyPolicyService {
  shouldConsider(input: {
    bot: Bot;
    conversation: Conversation;
    inbound: InboundMessageDto;
  }): boolean {
    const { inbound, conversation, bot } = input;

    // Bot never replies to itself.
    if (inbound.isSelf) return false;

    // Text-only policy — no vision/audio available.
    const text = inbound.text?.trim();
    if (!text) return false;
    if (inbound.attachments && inbound.attachments.length > 0) return false;

    // Group thread: require mention OR explicit alwaysReply flag.
    if (conversation.threadType === ThreadType.group) {
      const meta = (conversation.metadata as Record<string, unknown>) ?? {};
      if (meta.alwaysReply === true) return true;
      return (inbound.mentions ?? []).includes(bot.externalId);
    }

    return true;
  }
}
