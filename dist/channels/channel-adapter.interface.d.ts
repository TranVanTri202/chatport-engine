import { ChannelType, ThreadType } from '@/shared/types';
export interface ChannelCredentialsHint {
    kind: 'qr' | 'token' | 'link' | 'none';
    data?: unknown;
}
export type AttachmentType = 'image' | 'video' | 'file' | 'voice' | 'sticker' | 'location' | 'link';
export type MessageType = 'chat' | 'image' | 'video' | 'file' | 'voice' | 'sticker' | 'link' | 'unknown';
export interface InboundAttachment {
    type: AttachmentType;
    url?: string;
    mime?: string;
    size?: number;
    meta?: Record<string, unknown>;
}
export interface InboundMessage {
    channel: ChannelType;
    botExternalId: string;
    threadId: string;
    threadType: ThreadType;
    senderExternalId: string;
    senderName?: string;
    messageExternalId: string;
    timestamp: number;
    type: MessageType;
    text?: string;
    attachments: InboundAttachment[];
    quote?: {
        messageExternalId: string;
        text?: string;
    };
    mentions?: string[];
    isSelf?: boolean;
    raw: unknown;
}
export interface OutboundAttachment {
    url: string;
    caption?: string;
}
export interface OutboundMessage {
    threadId: string;
    threadType: ThreadType;
    type: MessageType;
    text?: string;
    attachments?: OutboundAttachment[];
    quote?: {
        messageExternalId: string;
    };
}
export interface SendResult {
    messageExternalId: string | null;
    sentAt: number;
}
export type ChannelStatus = 'online' | 'offline' | 'expired';
export interface StartLoginInput {
    customerId: number;
}
export interface StartLoginResult {
    sessionId: string;
    hint: ChannelCredentialsHint;
}
export interface IChannelAdapter {
    readonly channel: ChannelType;
    startLogin(input: StartLoginInput): Promise<StartLoginResult>;
    restore(botId: number): Promise<void>;
    logout(botId: number): Promise<void>;
    send(botExternalId: string, msg: OutboundMessage): Promise<SendResult>;
    status(botExternalId: string): Promise<ChannelStatus>;
}
