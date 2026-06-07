import type { Bot, Conversation, Document } from '@prisma/client';
import type { BotStatus } from '@/shared/types';
import type { InboundMessageDto } from '@/messaging/dto/inbound-message.dto';
import type { OutboundMessageDto } from '@/messaging/dto/outbound-message.dto';

/**
 * Single source of truth for in-process event names. Always reference these
 * constants — never inline a string in `events.emit('...')` or `@OnEvent('...')`.
 *
 * Adding an event:
 *   1. Add a constant here.
 *   2. Add its payload interface below with the same key.
 *   3. Emit it from where the state change happens.
 *   4. Subscribe in any listener via `@OnEvent(DOMAIN_EVENTS.Xxx)`.
 *
 * The events.module.ts is `@Global()` — emitter/listener decorators work
 * everywhere without re-importing the module.
 */
export const DOMAIN_EVENTS = {
  /** Inbound message persisted; before any auto-reply decision. */
  MessageReceived: 'message.received',

  /** Outbound message sent + persisted. */
  MessageSent: 'message.sent',

  /** Bot status transition (active ↔ inactive ↔ expired). */
  BotStatusChanged: 'bot.status.changed',

  /** Document RAG status transition (pending → embedded | failed). */
  DocumentStatusChanged: 'document.status.changed',

  /** Message reaction added/updated. */
  MessageReacted: 'message.reacted',

  /** Conversation updated (e.g. metadata, title, members). */
  ConversationUpdated: 'conversation.updated',

  /** Message recalled/undone. */
  MessageRecalled: 'message.recalled',

  /** Contacts/friend requests list updated. */
  ContactsUpdated: 'contacts.updated',
} as const;

export interface MessageReceivedEvent {
  bot: Bot;
  conversation: Conversation;
  inbound: InboundMessageDto;
  messageId: string;
}

export interface MessageSentEvent {
  bot: Bot;
  outbound: OutboundMessageDto;
  conversationId: number;
  messageId: string;
  sentAt: number;
}

export interface BotStatusChangedEvent {
  botId: number;
  customerId: number;
  from: BotStatus;
  to: BotStatus;
  reason?: string;
}

export interface DocumentStatusChangedEvent {
  document: Document;
  from: string;
  to: string;
  error?: string;
}

export interface MessageReactedEvent {
  customerId: number;
  conversationId: number;
  messageExternalId: string;
  reactions: Array<{ userId: string; userName: string; reaction: string }>;
}

export interface ConversationUpdatedEvent {
  customerId: number;
  conversationId: number;
}

export interface MessageRecalledEvent {
  customerId: number;
  conversationId: number;
  messageExternalId: string;
}

export interface ContactsUpdatedEvent {
  customerId: number;
}

