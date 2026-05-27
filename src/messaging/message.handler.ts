import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConversationService } from '@/conversations/conversation.service';
import { MessageService } from '@/conversations/message.service';
import { MessageDirection } from '@/shared/types';
import {
  DOMAIN_EVENTS,
  MessageReceivedEvent,
} from '@/shared/events/domain-events';
import { InboundMessageDto } from './dto/inbound-message.dto';

/**
 * Single inbound handler for ALL thread types and ALL channels.
 *
 * Earlier we had UserMessageHandler + GroupMessageHandler that were 90%
 * identical — only the auto-reply gate differed. That rule now lives in
 * `ReplyPolicyService` and the decision-to-reply is decoupled from this
 * handler entirely (we emit `message.received` and `BotResponseService`
 * listens). Adding e.g. an AuditListener later won't touch this file.
 */
@Injectable()
export class MessageHandler {
  constructor(
    private readonly conversations: ConversationService,
    private readonly messages: MessageService,
    private readonly events: EventEmitter2,
  ) {}

  async handle(msg: InboundMessageDto): Promise<void> {
    const { conversation, bot } = await this.conversations.upsertFromInbound(msg);

    const persisted = await this.messages.persistInbound({
      conversationId: conversation.id,
      direction: MessageDirection.in,
      msg,
    });

    const event: MessageReceivedEvent = {
      bot,
      conversation,
      inbound: msg,
      messageId: persisted.id.toString(),
    };
    this.events.emit(DOMAIN_EVENTS.MessageReceived, event);
  }
}
