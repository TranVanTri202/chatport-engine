import { ThreadType } from '@/shared/types';
export declare class SendImageMessageDto {
    botExternalId: string;
    threadId: string;
    threadType: ThreadType;
    caption?: string;
    quoteMessageExternalId?: string;
}
