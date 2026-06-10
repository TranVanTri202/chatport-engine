import { Injectable } from '@nestjs/common';
import { Message, MessageType, Prisma } from '@prisma/client';
import { MessageDirection } from '@/shared/types';
import {
  InboundAttachment,
  OutboundAttachment,
} from '@/channels/channel-adapter.interface';
import { InboundMessageDto } from '@/messaging/dto/inbound-message.dto';
import { MessageRepository } from './repositories/message.repository';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { ZaloZcaService } from '@/channels/zalo/zalo-zca.service';
import { ZaloNormalizer } from '@/channels/zalo/zalo.normalizer';

const DEFAULT_HISTORY_LIMIT = 20;

@Injectable()
export class MessageService {
  constructor(
    private readonly repo: MessageRepository,
    private readonly prisma: PrismaService,
    private readonly zaloZcaService: ZaloZcaService,
    private readonly zaloNormalizer: ZaloNormalizer,
  ) {}

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
      raw: msg.raw as any,
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
    if (msg.type === 'pin') return 'pin';
    if (msg.type === 'unknown') return 'unknown';
    if (msg.attachments.length === 0) return 'webchat';
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
    
    let rows = cursorBigInt !== undefined
      ? await this.repo.findManyPagedWithCursor(input.conversationId, take + 1, cursorBigInt)
      : await this.repo.findManyPaged(input.conversationId, take + 1);

    if (rows.length === 0 && cursorBigInt === undefined) {
      try {
        const convo = await this.prisma.conversation.findUnique({
          where: { id: input.conversationId },
          include: { bot: true },
        });

        console.log(`[HistorySync] Checking convo ID=${input.conversationId}, threadType=${convo?.threadType}, channel=${convo?.bot.channel}`);

        if (convo && convo.threadType === 'group' && convo.bot.channel === 'zalo') {
          console.log(`[HistorySync] Fetching Zalo history for bot=${convo.bot.externalId}, thread=${convo.threadExternalId}`);
          const history = await this.zaloZcaService.getGroupChatHistory(
            convo.bot.externalId,
            convo.threadExternalId,
            30,
          );

          console.log(`[HistorySync] Zalo history response:`, JSON.stringify(history));

          if (history && history.groupMsgs && history.groupMsgs.length > 0) {
            console.log(`[HistorySync] Found ${history.groupMsgs.length} messages to sync`);
            for (const rawMsg of history.groupMsgs) {
              const inbound = this.zaloNormalizer.normalizeMessage({
                botExternalId: convo.bot.externalId,
                raw: rawMsg,
              });

              const direction = inbound.isSelf ? 'out' : 'in';

              await this.repo.upsertInbound({
                conversationId: convo.id,
                direction,
                senderExternalId: inbound.senderExternalId,
                messageExternalId: inbound.messageExternalId,
                type: this.resolveMessageType({
                  attachments: inbound.attachments,
                } as any),
                text: inbound.text ?? null,
                attachments: inbound.attachments as any,
                quoteOfExternalId: inbound.quote?.messageExternalId ?? null,
              });
            }

            rows = await this.repo.findManyPaged(input.conversationId, take + 1);
            console.log(`[HistorySync] Successfully synced history, new DB row count: ${rows.length}`);
          } else {
            console.log(`[HistorySync] Zalo history returned no messages`);
          }
        }
      } catch (err) {
        console.error('[HistorySync] Failed to sync group chat history:', err);
      }
    }

    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;
    return {
      items,
      nextCursor: hasMore ? items[items.length - 1]!.id.toString() : null,
    };
  }
}
