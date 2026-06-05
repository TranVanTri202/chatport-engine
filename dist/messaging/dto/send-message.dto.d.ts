import { MessageType, ThreadType } from '@/shared/types';
import { OutboundAttachmentDto } from './outbound-attachment.dto';
export declare class SendMessageDto {
    botExternalId: string;
    threadId: string;
    threadType: ThreadType;
    type: MessageType;
    text?: string;
    attachments?: OutboundAttachmentDto[];
}
