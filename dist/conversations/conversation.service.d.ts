import { Bot, Conversation } from '@prisma/client';
import { ChannelType, ThreadType } from '@/shared/types';
import { InboundMessageDto } from '@/messaging/dto/inbound-message.dto';
import { ZaloZcaService } from '@/channels/zalo/zalo-zca.service';
import { ConversationRepository } from './repositories/conversation.repository';
export type ConversationListItem = Conversation & {
    avatar: string | null;
};
export type ConversationDetailItem = Conversation & {
    avatar: string | null;
    participants: Array<{
        id: number;
        conversationId: number;
        externalId: string;
        displayName: string | null;
        avatar: string | null;
        isBot: boolean;
    }>;
};
export declare class ConversationService {
    private readonly repo;
    private readonly zaloZcaService;
    constructor(repo: ConversationRepository, zaloZcaService: ZaloZcaService);
    getBotByExternal(channel: ChannelType, externalId: string): Promise<Bot>;
    private resolveUserProfile;
    upsertFromInbound(msg: InboundMessageDto): Promise<{
        conversation: Conversation;
        bot: Bot;
    }>;
    getOrCreate(input: {
        botId: number;
        threadType: ThreadType;
        threadExternalId: string;
    }): Promise<Conversation>;
    getOrCreateBySession(input: {
        botId: number;
        sessionId: string;
        threadType?: ThreadType;
    }): Promise<Conversation>;
    listForBot(input: {
        channel: ChannelType;
        externalId: string;
        limit?: number;
        cursor?: number;
    }): Promise<{
        items: ConversationListItem[];
        nextCursor: number | null;
    }>;
    getById(id: number): Promise<ConversationDetailItem>;
    listParticipants(input: {
        conversationId: number;
        limit?: number;
        cursor?: number;
    }): Promise<{
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
    getSummary(id: number): Promise<string | null>;
    setSummary(id: number, summary: string): Promise<void>;
    getContextSnapshot(id: number): Promise<{
        summary: string | null;
    }>;
    updateContextSnapshot(id: number, summary: string): Promise<void>;
    markRead(id: number): Promise<void>;
    updateAutoReply(id: number, autoReplyEnabled: boolean): Promise<void>;
}
