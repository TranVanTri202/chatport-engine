import { InboundMessage } from '../channel-adapter.interface';
export declare class ZaloNormalizer {
    normalizeMessage(input: {
        botExternalId: string;
        raw: ZaloRawMessage;
    }): InboundMessage;
    private resolveMessageType;
    private extractContent;
}
export interface ZaloRawMessage {
    msgId?: string | number;
    msgType?: string;
    threadId?: string | number;
    threadType?: 'user' | 'group';
    senderId?: string | number;
    senderName?: string;
    content?: unknown;
    ts?: number;
    quote?: {
        msgId: string | number;
        text?: string;
    };
    mentions?: Array<string | number>;
    data?: {
        actionId?: string;
        msgId?: string | number;
        cliMsgId?: string;
        msgType?: string;
        uidFrom?: string | number;
        idTo?: string | number;
        dName?: string;
        ts?: string | number;
        content?: unknown;
        quote?: {
            msgId: string | number;
            text?: string;
        };
        mentions?: Array<string | number>;
    };
}
