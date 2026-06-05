import { ThreadType } from '@/shared/types';
export declare class SendImageFileDto {
    botExternalId: string;
    threadId: string;
    threadType: ThreadType;
    caption?: string;
    quoteMessageExternalId?: string;
}
