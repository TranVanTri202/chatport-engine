import { Bot, Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { ChannelType } from '@/shared/types';
export declare class BotRepository {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findManyByCustomer(customerId: number): Prisma.PrismaPromise<({
        _count: {
            contacts: number;
            friendRequests: number;
        };
    } & {
        customerId: number;
        status: import("@prisma/client").$Enums.BotStatus;
        temperature: number | null;
        maxTokens: number | null;
        topP: number | null;
        frequencyPenalty: number | null;
        presencePenalty: number | null;
        id: number;
        channel: import("@prisma/client").$Enums.ChannelType;
        externalId: string;
        name: string | null;
        avatar: string | null;
        systemPrompt: string | null;
        autoReplyEnabled: boolean;
        activeHours: string | null;
        fallbackReplies: string[];
        llmModel: string | null;
        ragTopK: number | null;
        settings: Prisma.JsonValue;
        requestQuota: number;
        requestUsed: number;
        documentQuota: number;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    findByIdDetailed(id: number): Promise<({
        conversations: {
            lastMessageAt: Date | null;
        }[];
        _count: {
            documents: number;
            conversations: number;
        };
    } & {
        customerId: number;
        status: import("@prisma/client").$Enums.BotStatus;
        temperature: number | null;
        maxTokens: number | null;
        topP: number | null;
        frequencyPenalty: number | null;
        presencePenalty: number | null;
        id: number;
        channel: import("@prisma/client").$Enums.ChannelType;
        externalId: string;
        name: string | null;
        avatar: string | null;
        systemPrompt: string | null;
        autoReplyEnabled: boolean;
        activeHours: string | null;
        fallbackReplies: string[];
        llmModel: string | null;
        ragTopK: number | null;
        settings: Prisma.JsonValue;
        requestQuota: number;
        requestUsed: number;
        documentQuota: number;
        createdAt: Date;
        updatedAt: Date;
    }) | null>;
    findById(id: number): Promise<Bot | null>;
    findByExternal(channel: ChannelType, externalId: string): Promise<Bot | null>;
    create(data: Prisma.BotUncheckedCreateInput): Promise<Bot>;
    update(id: number, data: Prisma.BotUpdateInput): Promise<Bot>;
    delete(id: number): Promise<Bot>;
    getSystemPrompt(botId: number): Promise<string | null>;
    listDocuments(botId: number): Prisma.PrismaPromise<{
        status: string;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        botId: number;
        title: string;
        metadata: Prisma.JsonValue;
        source: string | null;
        mimeType: string | null;
        rawText: string;
    }[]>;
    detachDocument(botId: number, documentId: number): Prisma.Prisma__DocumentClient<{
        status: string;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        botId: number;
        title: string;
        metadata: Prisma.JsonValue;
        source: string | null;
        mimeType: string | null;
        rawText: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    attachDocuments(botId: number, documentIds: number[]): Prisma.PrismaPromise<Prisma.BatchPayload>;
    tryConsumeRequest(botId: number): Promise<{
        id: number;
        requestUsed: number;
        requestQuota: number;
    } | null>;
    refundRequest(botId: number): Promise<void>;
    resetRequestCounter(botId: number): Promise<void>;
}
