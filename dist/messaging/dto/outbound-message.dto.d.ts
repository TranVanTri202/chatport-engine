import { ChannelType, MessageType, ThreadType } from '@/shared/types';
import { OutboundAttachment } from '@/channels/channel-adapter.interface';
export declare class OutboundMessageDto {
    botId: number;
    channel: ChannelType;
    botExternalId: string;
    threadId: string;
    threadType: ThreadType;
    type: MessageType;
    text?: string;
    attachments?: OutboundAttachment[];
    quote?: {
        messageExternalId: string;
    };
}
