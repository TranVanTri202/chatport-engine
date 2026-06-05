import { ICommand } from '@nestjs/cqrs';
import { MessageType, ThreadType } from '@/shared/types';
import { OutboundAttachment } from '@/channels/channel-adapter.interface';
export declare class SendMessageCommand implements ICommand {
    readonly input: {
        botExternalId: string;
        threadId: string;
        threadType: ThreadType;
        type: MessageType;
        text?: string;
        attachments?: OutboundAttachment[];
        quote?: {
            messageExternalId: string;
        };
    };
    constructor(input: {
        botExternalId: string;
        threadId: string;
        threadType: ThreadType;
        type: MessageType;
        text?: string;
        attachments?: OutboundAttachment[];
        quote?: {
            messageExternalId: string;
        };
    });
}
