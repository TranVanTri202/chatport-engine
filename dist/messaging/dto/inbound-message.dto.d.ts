import { ChannelType, ThreadType } from '@/shared/types';
import { InboundAttachment } from '@/channels/channel-adapter.interface';
export declare class InboundMessageDto {
    channel: ChannelType;
    botExternalId: string;
    threadId: string;
    threadType: ThreadType;
    senderExternalId: string;
    senderName?: string;
    messageExternalId: string;
    timestamp: number;
    type: 'chat' | 'image' | 'video' | 'file' | 'voice' | 'sticker' | 'link' | 'unknown';
    text?: string;
    attachments: InboundAttachment[];
    quote?: {
        messageExternalId: string;
        text?: string;
    };
    mentions?: string[];
    isSelf?: boolean;
    raw?: unknown;
}
