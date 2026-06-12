import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';

/**
 * Thin data-access layer for cross-domain lookups needed by ZaloZcaService.
 * Keeps raw Prisma out of the ZCA wrapper so it stays focused on API calls.
 */
@Injectable()
export class ZaloRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Resolve internal bot ID from Zalo external ID. */
  async findBotIdByExternal(botExternalId: string): Promise<number | null> {
    const bot = await this.prisma.bot.findUnique({
      where: { channel_externalId: { channel: 'zalo', externalId: botExternalId } },
      select: { id: true },
    });
    return bot?.id ?? null;
  }

  /** Convert a numeric contact-ID to the real Zalo external ID. */
  async resolveContactExternalId(botExternalId: string, contactId: number): Promise<string | null> {
    const bot = await this.prisma.bot.findUnique({
      where: { channel_externalId: { channel: 'zalo', externalId: botExternalId } },
      select: { id: true },
    });
    if (!bot) return null;
    const contact = await this.prisma.contact.findFirst({
      where: { botId: bot.id, id: contactId },
      select: { externalId: true },
    });
    return contact?.externalId ?? null;
  }

  /** Find conversation ID by bot + thread (Zalo group/user ID). */
  async findConversationIdByBotAndThread(botId: number, threadId: string): Promise<number | null> {
    const convo = await this.prisma.conversation.findFirst({
      where: { botId, threadExternalId: threadId },
      select: { id: true },
    });
    return convo?.id ?? null;
  }

  /** Look up a persisted message by its composite key. */
  async findMessageByCompositeKey(conversationId: number, messageExternalId: string) {
    return this.prisma.message.findUnique({
      where: {
        conversationId_messageExternalId: { conversationId, messageExternalId },
      },
    });
  }

  /** Look up participant display name. */
  async findParticipantName(conversationId: number, externalId: string): Promise<string | null> {
    const p = await this.prisma.participant.findFirst({
      where: { conversationId, externalId },
      select: { displayName: true },
    });
    return p?.displayName ?? null;
  }

  /** Find a message by external ID across all conversations of a bot. */
  async findMessageByExternalForBot(botId: number, messageExternalId: string) {
    return this.prisma.message.findFirst({
      where: {
        conversation: { botId },
        messageExternalId: String(messageExternalId),
      },
    });
  }

  /** Update message raw field (for recall/undo). */
  async updateMessageRaw(messageId: bigint, raw: Record<string, unknown>): Promise<void> {
    await this.prisma.message.update({
      where: { id: messageId },
      data: { raw: raw as any },
    });
  }

  /** Update message reactions field. */
  async updateMessageReactions(messageId: bigint, reactions: unknown): Promise<void> {
    await this.prisma.message.update({
      where: { id: messageId },
      data: { reactions: reactions as any },
    });
  }

  /** Find message by time range (fallback for reactions). */
  async findMessageByTimeRange(conversationId: number, startTime: Date, endTime: Date) {
    return this.prisma.message.findFirst({
      where: {
        conversationId,
        createdAt: { gte: startTime, lte: endTime },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
