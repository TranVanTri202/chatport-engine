import { Conversation, Participant, Bot, Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { ChannelType, ThreadType } from '@/shared/types';
export declare class ConversationRepository {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findBotByExternal(channel: ChannelType, externalId: string): Promise<Bot | null>;
    findParticipantProfile(channel: ChannelType, botExternalId: string, userId: string): Promise<{
        displayName: string | null;
        avatar: string | null;
    } | null>;
    upsertConversationFromInbound(input: {
        botId: number;
        threadExternalId: string;
        threadType: ThreadType;
        title: string | null;
        avatar: string | null;
        timestamp: Date;
        text: string | null;
        senderExternalId: string;
        senderName: string | null;
        senderAvatar: string | null;
        isSelf?: boolean;
        memberCount?: number;
    }): Promise<Conversation>;
    upsertParticipant(input: {
        conversationId: number;
        externalId: string;
        displayName: string | null;
        avatar: string | null;
        isBot: boolean;
    }): Promise<Participant>;
    getOrCreate(input: {
        botId: number;
        threadType: ThreadType;
        threadExternalId: string;
    }): Promise<Conversation>;
    findManyByBot(botId: number, limit: number, cursor?: number): Promise<Conversation[]>;
    findById(id: number): Promise<Conversation | null>;
    findManyParticipants(conversationId: number, limit: number, cursor?: number): Promise<Participant[]>;
    findMetadata(id: number): Promise<Prisma.JsonValue | null>;
    updateMetadata(id: number, metadata: Prisma.InputJsonValue): Promise<Conversation>;
    updateUnread(id: number, unread: number): Promise<Conversation>;
    updateAutoReply(id: number, autoReplyEnabled: boolean): Promise<Conversation>;
}
