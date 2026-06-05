import type { Bot, Conversation, Document } from '@prisma/client';
import type { BotStatus } from '@/shared/types';
import type { InboundMessageDto } from '@/messaging/dto/inbound-message.dto';
import type { OutboundMessageDto } from '@/messaging/dto/outbound-message.dto';
export declare const DOMAIN_EVENTS: {
    readonly MessageReceived: "message.received";
    readonly MessageSent: "message.sent";
    readonly BotStatusChanged: "bot.status.changed";
    readonly DocumentStatusChanged: "document.status.changed";
    readonly MessageReacted: "message.reacted";
};
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
    reactions: Array<{
        userId: string;
        userName: string;
        reaction: string;
    }>;
}
