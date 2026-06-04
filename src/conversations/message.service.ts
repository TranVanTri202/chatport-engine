import { Injectable } from '@nestjs/common';
import { Message, MessageType, Prisma } from '@prisma/client';
import { MessageDirection } from '@/shared/types';
import {
  InboundAttachment,
  OutboundAttachment,
} from '@/channels/channel-adapter.interface';
import { InboundMessageDto } from '@/messaging/dto/inbound-message.dto';
import { MessageRepository } from './repositories/message.repository';

const DEFAULT_HISTORY_LIMIT = 20;

@Injectable()
export class MessageService {
  constructor(private readonly repo: MessageRepository) {}

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
    return this.repo.upsertInbound({
      conversationId,
      direction,
      senderExternalId: msg.senderExternalId,
      messageExternalId: msg.messageExternalId,
      type: this.resolveMessageType(msg),
      text: msg.text ?? null,
      attachments: msg.attachments as unknown as Prisma.InputJsonValue,
      quoteOfExternalId: msg.quote?.messageExternalId ?? null,
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
    return this.repo.createOutbound({
      conversationId: input.conversationId,
      direction: input.direction,
      senderExternalId: input.senderExternalId,
      messageExternalId: input.messageExternalId,
      text: input.text ?? null,
      attachments: input.attachments as unknown as Prisma.InputJsonValue,
    });
  }

  private resolveMessageType(msg: InboundMessageDto): MessageType {
    if (msg.attachments.length === 0) return 'chat';
    const types = new Set(msg.attachments.map((a) => a.type));
    if (types.has('image')) return 'image';
    if (types.has('video')) return 'video';
    if (types.has('file')) return 'file';
    if (types.has('voice')) return 'voice';
    if (types.has('sticker')) return 'sticker';
    if (types.has('link')) return 'link';
    return 'unknown';
  }

  /** Most-recent N messages, returned in chronological order for LLM history. */
  async lastN(conversationId: number, limit = 10): Promise<Message[]> {
    const rows = await this.repo.findLastN(conversationId, limit);
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
    
    const rows = cursorBigInt !== undefined
      ? await this.repo.findManyPagedWithCursor(input.conversationId, take + 1, cursorBigInt)
      : await this.repo.findManyPaged(input.conversationId, take + 1);

    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;
    return {
      items,
      nextCursor: hasMore ? items[items.length - 1]!.id.toString() : null,
    };
  }
}
