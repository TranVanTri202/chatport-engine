import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  BotStatusChangedEvent,
  DOMAIN_EVENTS,
  DocumentStatusChangedEvent,
  MessageReceivedEvent,
  MessageSentEvent,
} from '@/shared/events/domain-events';
import { RealtimeGateway } from './realtime.gateway';

/**
 * Bridge domain events → socket pushes. Lives in realtime/ so the rest of
 * the app stays agnostic about Socket.IO: any module that wants to notify
 * the FE just emits a domain event.
 */
@Injectable()
export class RealtimeListener {
  constructor(private readonly gateway: RealtimeGateway) {}

  @OnEvent(DOMAIN_EVENTS.MessageReceived)
  onReceived(e: MessageReceivedEvent): void {
    this.gateway.emitToCustomer(e.bot.customerId, 'message:new', {
      conversationId: e.conversation.id,
      messageId: e.messageId,
      direction: 'in',
      text: e.inbound.text,
      attachments: e.inbound.attachments,
      senderExternalId: e.inbound.senderExternalId,
      ts: e.inbound.timestamp,
    });
  }

  @OnEvent(DOMAIN_EVENTS.MessageSent)
  onSent(e: MessageSentEvent): void {
    this.gateway.emitToCustomer(e.bot.customerId, 'message:sent', {
      conversationId: e.conversationId,
      messageId: e.messageId,
      direction: 'out',
      text: e.outbound.text,
      attachments: e.outbound.attachments ?? [],
      ts: e.sentAt,
    });
  }

  @OnEvent(DOMAIN_EVENTS.BotStatusChanged)
  onBotStatus(e: BotStatusChangedEvent): void {
    this.gateway.emitToCustomer(e.customerId, 'bot:status', {
      botId: e.botId,
      from: e.from,
      to: e.to,
      reason: e.reason,
    });
  }

  @OnEvent(DOMAIN_EVENTS.DocumentStatusChanged)
  onDocStatus(e: DocumentStatusChangedEvent): void {
    this.gateway.emitToCustomer(e.document.botId, 'document:status', {
      documentId: e.document.id,
      from: e.from,
      to: e.to,
      error: e.error,
    });
  }
}
