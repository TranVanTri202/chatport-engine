import { ThreadType } from '@/shared/types';
export declare class SendTextMessageDto {
    botExternalId: string;
    threadId: string;
    threadType: ThreadType;
    text: string;
    quoteMessageExternalId?: string;
}
