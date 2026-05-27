import { Injectable } from '@nestjs/common';
import { Message, Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { MessageDirection } from '@/shared/types';
import {
  InboundAttachment,
  OutboundAttachment,
} from '@/channels/channel-adapter.interface';
import { InboundMessageDto } from '@/messaging/dto/inbound-message.dto';

const DEFAULT_HISTORY_LIMIT = 20;

@Injectable()
export class MessageService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Idempotent insert keyed on (conversationId, messageExternalId).
   * If the channel re-delivers the same event the upsert is a no-op.
   */
  async persistInbound(input: {
    conversationId: number;
    direction: MessageDirection;
    msg: InboundMessageDto;
  }): Promise<Message> {
    const { conversationId, direction, msg } = input;
    return this.prisma.message.upsert({
      where: {
        conversationId_messageExternalId: {
          conversationId,
          messageExternalId: msg.messageExternalId,
        },
      },
      create: {
        conversationId,
        direction,
        senderExternalId: msg.senderExternalId,
        messageExternalId: msg.messageExternalId,
        text: msg.text,
        attachments: msg.attachments as unknown as Prisma.InputJsonValue,
        quoteOfExternalId: msg.quote?.messageExternalId,
      },
      update: {},
    });
  }

  async persistOutbound(input: {
    conversationId: number;
    direction: MessageDirection;
    text?: string;
    attachments: OutboundAttachment[] | InboundAttachment[];
    messageExternalId: string | null;
    senderExternalId: string;
  }): Promise<Message> {
    return this.prisma.message.create({
      data: {
        conversationId: input.conversationId,
        direction: input.direction,
        senderExternalId: input.senderExternalId,
        messageExternalId: input.messageExternalId,
        text: input.text,
        attachments: input.attachments as unknown as Prisma.InputJsonValue,
      },
    });
  }

  /** Most-recent N messages, returned in chronological order for LLM history. */
  async lastN(conversationId: number, limit = 10): Promise<Message[]> {
    const rows = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.reverse();
  }

  /**
   * Cursor pagination for the chat UI.
   *
   * Returns newest-first slice plus a `nextCursor` that the FE passes back
   * to load the slice just before it (i.e. scroll-up to older messages).
   * Cursor is `Message.id` as string (BigInt).
   */
  async listByConversation(input: {
    conversationId: number;
    limit?: number;
    cursor?: string;
  }) {
    const take = input.limit ?? DEFAULT_HISTORY_LIMIT;
    const cursorBigInt = input.cursor ? BigInt(input.cursor) : undefined;
    const rows = await this.prisma.message.findMany({
      where: { conversationId: input.conversationId },
      orderBy: { id: 'desc' },
      take: take + 1,
      ...(cursorBigInt !== undefined && {
        cursor: { id: cursorBigInt },
        skip: 1,
      }),
    });
    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;
    return {
      items,
      nextCursor: hasMore ? items[items.length - 1]!.id.toString() : null,
    };
  }
}
