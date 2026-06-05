import { ConversationListItem, ConversationService } from './conversation.service';
import { MessageService } from './message.service';
import { ListConversationsQuery, ListMessagesQuery, ListParticipantsQuery } from './dto/list-conversations.dto';
export declare class ConversationsController {
    private readonly conversations;
    private readonly messageService;
    constructor(conversations: ConversationService, messageService: MessageService);
    list(channel: string, externalId: string, query: ListConversationsQuery): Promise<{
        items: ConversationListItem[];
        nextCursor: number | null;
    }>;
    detail(id: number): Promise<import("./conversation.service").ConversationDetailItem>;
    participants(id: number, query: ListParticipantsQuery): Promise<{
        items: {
            id: number;
            externalId: string;
            avatar: string | null;
            conversationId: number;
            displayName: string | null;
            isBot: boolean;
        }[];
        nextCursor: number | null;
    }>;
    messages(id: number, query: ListMessagesQuery): Promise<{
        items: {
            type: import("@prisma/client").$Enums.MessageType;
            text: string | null;
            id: bigint;
            createdAt: Date;
            conversationId: number;
            direction: import("@prisma/client").$Enums.MessageDirection;
            senderExternalId: string | null;
            messageExternalId: string | null;
            attachments: import("@prisma/client/runtime/library").JsonValue;
            reactions: import("@prisma/client/runtime/library").JsonValue;
            quoteOfExternalId: string | null;
            raw: import("@prisma/client/runtime/library").JsonValue | null;
        }[];
        nextCursor: string | null;
    }>;
    markRead(id: number): Promise<{
        ok: boolean;
    }>;
    toggleAutoReply(id: number, body: {
        autoReplyEnabled: boolean;
    }): Promise<{
        ok: boolean;
    }>;
}
