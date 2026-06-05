import { Message, MessageType, Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/prisma/prisma.service';
export declare class MessageRepository {
    private readonly prisma;
    constructor(prisma: PrismaService);
    upsertInbound(input: {
        conversationId: number;
        direction: 'in' | 'out';
        senderExternalId: string;
        messageExternalId: string;
        type: MessageType;
        text: string | null;
        attachments: Prisma.InputJsonValue;
        quoteOfExternalId: string | null;
    }): Promise<Message>;
    createOutbound(data: Prisma.MessageUncheckedCreateInput): Promise<Message>;
    findLastN(conversationId: number, limit: number): Promise<Message[]>;
    findManyPaged(conversationId: number, limit: number): Promise<Message[]>;
    findManyPagedWithCursor(conversationId: number, limit: number, cursor: bigint): Promise<Message[]>;
}
