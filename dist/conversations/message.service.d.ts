import { Message, Prisma } from '@prisma/client';
import { MessageDirection } from '@/shared/types';
import { InboundAttachment, OutboundAttachment } from '@/channels/channel-adapter.interface';
import { InboundMessageDto } from '@/messaging/dto/inbound-message.dto';
import { MessageRepository } from './repositories/message.repository';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { ZaloZcaService } from '@/channels/zalo/zalo-zca.service';
import { ZaloNormalizer } from '@/channels/zalo/zalo.normalizer';
export declare class MessageService {
    private readonly repo;
    private readonly prisma;
    private readonly zaloZcaService;
    private readonly zaloNormalizer;
    constructor(repo: MessageRepository, prisma: PrismaService, zaloZcaService: ZaloZcaService, zaloNormalizer: ZaloNormalizer);
    persistInbound(input: {
        conversationId: number;
        direction: MessageDirection;
        msg: InboundMessageDto;
    }): Promise<Message>;
    persistOutbound(input: {
        conversationId: number;
        direction: MessageDirection;
        text?: string;
        attachments: OutboundAttachment[] | InboundAttachment[];
        messageExternalId: string | null;
        senderExternalId: string;
    }): Promise<Message>;
    private resolveMessageType;
    lastN(conversationId: number, limit?: number): Promise<Message[]>;
    listByConversation(input: {
        conversationId: number;
        limit?: number;
        cursor?: string;
    }): Promise<{
        items: {
            type: import("@prisma/client").$Enums.MessageType;
            text: string | null;
            id: bigint;
            createdAt: Date;
            conversationId: number;
            direction: import("@prisma/client").$Enums.MessageDirection;
            senderExternalId: string | null;
            messageExternalId: string | null;
            attachments: Prisma.JsonValue;
            reactions: Prisma.JsonValue;
            quoteOfExternalId: string | null;
            raw: Prisma.JsonValue | null;
        }[];
        nextCursor: string | null;
    }>;
}
