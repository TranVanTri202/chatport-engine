import { Injectable, NotFoundException } from '@nestjs/common';
import { Bot, Conversation, Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { ChannelType, ThreadType } from '@/shared/types';
import { InboundMessageDto } from '@/messaging/dto/inbound-message.dto';

const DEFAULT_LIST_LIMIT = 30;

@Injectable()
export class ConversationService {
  constructor(private readonly prisma: PrismaService) {}

  /** Resolve the Bot row addressed by (channel, botExternalId). */
  async getBotByExternal(channel: ChannelType, externalId: string): Promise<Bot> {
    const bot = await this.prisma.bot.findUnique({
      where: { channel_externalId: { channel, externalId } },
    });
    if (!bot) {
      throw new NotFoundException(`Bot ${channel}:${externalId} not found`);
    }
    return bot;
  }

  /**
   * Upsert the Conversation + Participant rows for an incoming message,
   * returning the resolved Bot so handlers don't need a second lookup.
   */
  async upsertFromInbound(
    msg: InboundMessageDto,
  ): Promise<{ conversation: Conversation; bot: Bot }> {
    const bot = await this.getBotByExternal(msg.channel, msg.botExternalId);

    const conversation = await this.prisma.conversation.upsert({
      where: {
        botId_threadExternalId: {
          botId: bot.id,
          threadExternalId: msg.threadId,
        },
      },
      create: {
        botId: bot.id,
        threadType: msg.threadType,
        threadExternalId: msg.threadId,
        lastMessageAt: new Date(msg.timestamp),
        unread: 1,
      },
      update: {
        lastMessageAt: new Date(msg.timestamp),
        unread: { increment: 1 },
      },
    });

    await this.prisma.participant.upsert({
      where: {
        conversationId_externalId: {
          conversationId: conversation.id,
          externalId: msg.senderExternalId,
        },
      },
      create: {
        conversationId: conversation.id,
        externalId: msg.senderExternalId,
        displayName: msg.senderName,
        isBot: msg.senderExternalId === bot.externalId,
      },
      update: msg.senderName ? { displayName: msg.senderName } : {},
    });

    return { conversation, bot };
  }

  async getOrCreate(input: {
    botId: number;
    threadType: ThreadType;
    threadExternalId: string;
  }): Promise<Conversation> {
    return this.prisma.conversation.upsert({
      where: {
        botId_threadExternalId: {
          botId: input.botId,
          threadExternalId: input.threadExternalId,
        },
      },
      create: input,
      update: {},
    });
  }

  // ── Read API for the FE conversation list ────────────────────────

  /**
   * Cursor pagination by `id`. We sort by `lastMessageAt DESC` for UX but
   * use `id` as the cursor to keep ordering stable when many conversations
   * share the same `lastMessageAt` (e.g. just after seeding).
   */
  async listForBot(input: {
    botId: number;
    limit?: number;
    cursor?: number;
  }) {
    const take = input.limit ?? DEFAULT_LIST_LIMIT;
    const rows = await this.prisma.conversation.findMany({
      where: { botId: input.botId },
      orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      ...(input.cursor !== undefined && {
        cursor: { id: input.cursor },
        skip: 1,
      }),
    });
    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;
    return {
      items,
      nextCursor: hasMore ? items[items.length - 1]!.id : null,
    };
  }

  async getById(id: number): Promise<Conversation> {
    const c = await this.prisma.conversation.findUnique({
      where: { id },
      include: { participants: true },
    });
    if (!c) throw new NotFoundException(`Conversation ${id} not found`);
    return c;
  }

  async getSummary(id: number): Promise<string | null> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
      select: { metadata: true },
    });
    if (!conversation) throw new NotFoundException(`Conversation ${id} not found`);

    const metadata = conversation.metadata as Prisma.JsonObject | Prisma.JsonArray | null;
    if (!metadata || Array.isArray(metadata)) return null;

    const summary = metadata.summary;
    return typeof summary === 'string' && summary.trim().length > 0 ? summary.trim() : null;
  }

  async setSummary(id: number, summary: string): Promise<void> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
      select: { metadata: true },
    });
    if (!conversation) throw new NotFoundException(`Conversation ${id} not found`);

    const metadata = conversation.metadata as Prisma.JsonObject | Prisma.JsonArray | null;
    const nextMetadata = Array.isArray(metadata) ? {} : { ...(metadata ?? {}) };
    nextMetadata.summary = summary;

    await this.prisma.conversation.update({
      where: { id },
      data: { metadata: nextMetadata },
    });
  }

  async getContextSnapshot(id: number): Promise<{ summary: string | null }> {
    return { summary: await this.getSummary(id) };
  }

  async updateContextSnapshot(id: number, summary: string): Promise<void> {
    await this.setSummary(id, summary);
  }

  async markRead(id: number): Promise<void> {
    await this.prisma.conversation.update({
      where: { id },
      data: { unread: 0 },
    });
  }
}
