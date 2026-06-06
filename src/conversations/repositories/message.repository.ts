import { Injectable } from '@nestjs/common';
import { Message, MessageType, Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/prisma/prisma.service';

@Injectable()
export class MessageRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsertInbound(input: {
    conversationId: number;
    direction: 'in' | 'out';
    senderExternalId: string;
    messageExternalId: string;
    type: MessageType;
    text: string | null;
    attachments: Prisma.InputJsonValue;
    quoteOfExternalId: string | null;
    raw?: Prisma.InputJsonValue;
  }): Promise<Message> {
    return this.prisma.message.upsert({
      where: {
        conversationId_messageExternalId: {
          conversationId: input.conversationId,
          messageExternalId: input.messageExternalId,
        },
      },
      create: {
        conversationId: input.conversationId,
        direction: input.direction,
        senderExternalId: input.senderExternalId,
        messageExternalId: input.messageExternalId,
        type: input.type,
        text: input.text,
        attachments: input.attachments,
        quoteOfExternalId: input.quoteOfExternalId,
        raw: input.raw ?? undefined,
      },
      update: {},
    });
  }

  async createOutbound(data: Prisma.MessageUncheckedCreateInput): Promise<Message> {
    return this.prisma.message.create({ data });
  }

  async findLastN(conversationId: number, limit: number): Promise<Message[]> {
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findManyPaged(conversationId: number, limit: number): Promise<Message[]> {
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { id: 'desc' },
      take: limit,
    });
  }

  async findManyPagedWithCursor(conversationId: number, limit: number, cursor: bigint): Promise<Message[]> {
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { id: 'desc' },
      take: limit,
      cursor: { id: cursor },
      skip: 1,
    });
  }
}
