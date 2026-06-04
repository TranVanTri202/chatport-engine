import { Injectable, NotFoundException } from '@nestjs/common';
import { Bot, Conversation, Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { ChannelType, ThreadType } from '@/shared/types';
import { InboundMessageDto } from '@/messaging/dto/inbound-message.dto';
import { ZaloZcaService } from '@/channels/zalo/zalo-zca.service';

const DEFAULT_LIST_LIMIT = 30;

export type ConversationListItem = Conversation & {
  avatar: string | null;
};

export type ConversationDetailItem = Conversation & {
  avatar: string | null;
  participants: Array<{
    id: number;
    conversationId: number;
    externalId: string;
    displayName: string | null;
    avatar: string | null;
    isBot: boolean;
  }>;
};

@Injectable()
export class ConversationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly zaloZcaService: ZaloZcaService,
  ) {}

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

  private async resolveUserProfile(
    channel: ChannelType,
    botExternalId: string,
    userId: string,
  ) {
    if (channel !== 'zalo') return null;

    const existingParticipant = await this.prisma.participant.findFirst({
      where: {
        externalId: userId,
        conversation: {
          bot: {
            channel,
            externalId: botExternalId,
          },
        },
      },
      select: {
        displayName: true,
        avatar: true,
      },
    });

    const hasProfile = Boolean(existingParticipant?.displayName || existingParticipant?.avatar);
    if (hasProfile) {
      return existingParticipant;
    }

    const profile = await this.zaloZcaService.getUserProfile(botExternalId, userId);
    if (profile) {
      return profile;
    }

    return existingParticipant ?? null;
  }

  /**
   * Upsert the Conversation + Participant rows for an incoming message,
   * returning the resolved Bot so handlers don't need a second lookup.
   */
  async upsertFromInbound(
    msg: InboundMessageDto,
  ): Promise<{ conversation: Conversation; bot: Bot }> {
    const bot = await this.getBotByExternal(msg.channel, msg.botExternalId);

    const senderProfile = await this.resolveUserProfile(msg.channel, msg.botExternalId, msg.senderExternalId);

    const lastMessageSenderName = senderProfile?.displayName ?? msg.senderName ?? null;
    const lastMessageSenderAvatar = senderProfile?.avatar ?? null;

    const avatar = senderProfile?.avatar ?? null;
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
        title: senderProfile?.displayName ?? null,
        avatar,
        lastMessageAt: new Date(msg.timestamp),
        lastMessageText: msg.text ?? null,
        lastMessageSenderId: msg.senderExternalId,
        lastMessageSenderName,
        lastMessageSenderAvatar,
        lastMessageDirection: 'in',
        unread: 1,
      },
      update: {
        avatar,
        lastMessageAt: new Date(msg.timestamp),
        lastMessageText: msg.text ?? null,
        lastMessageSenderId: msg.senderExternalId,
        lastMessageSenderName,
        lastMessageSenderAvatar,
        lastMessageDirection: 'in',
        unread: { increment: 1 },
        ...(senderProfile?.displayName ? { title: senderProfile.displayName } : {}),
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
        displayName: senderProfile?.displayName ?? msg.senderName,
        avatar: senderProfile?.avatar ?? null,
        isBot: msg.senderExternalId === bot.externalId,
      },
      update: {
        ...(senderProfile?.displayName || msg.senderName ? { displayName: senderProfile?.displayName ?? msg.senderName } : {}),
        ...(senderProfile?.avatar ? { avatar: senderProfile.avatar } : {}),
      },
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

  async getOrCreateBySession(input: {
    botId: number;
    sessionId: string;
    threadType?: ThreadType;
  }): Promise<Conversation> {
    return this.getOrCreate({
      botId: input.botId,
      threadType: input.threadType ?? ThreadType.user,
      threadExternalId: input.sessionId,
    });
  }

  // ── Read API for the FE conversation list ────────────────────────

  /**
   * Cursor pagination by `id`. We sort by `lastMessageAt DESC` for UX but
   * use `id` as the cursor to keep ordering stable when many conversations
   * share the same `lastMessageAt` (e.g. just after seeding).
   */
  async listForBot(input: {
    channel: ChannelType;
    externalId: string;
    limit?: number;
    cursor?: number;
  }): Promise<{ items: ConversationListItem[]; nextCursor: number | null }> {
    const bot = await this.getBotByExternal(input.channel, input.externalId);
    const take = input.limit ?? DEFAULT_LIST_LIMIT;
    const rows = await this.prisma.conversation.findMany({
      where: { botId: bot.id },
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

  async getById(id: number): Promise<ConversationDetailItem> {
    const c = await this.prisma.conversation.findUnique({
      where: { id },
      include: {
        participants: {
          orderBy: [{ isBot: 'asc' }, { id: 'asc' }],
        },
      },
    });
    if (!c) throw new NotFoundException(`Conversation ${id} not found`);
    return c as ConversationDetailItem;
  }

  async listParticipants(input: {
    conversationId: number;
    limit?: number;
    cursor?: number;
  }) {
    const take = input.limit ?? 30;
    const rows = await this.prisma.participant.findMany({
      where: { conversationId: input.conversationId },
      orderBy: [{ isBot: 'asc' }, { id: 'asc' }],
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

  async listMessages(conversationId: number, limit?: number, cursor?: string) {
    const take = limit ?? 20;
    const cursorBigInt = cursor ? BigInt(cursor) : undefined;
    const rows = await this.prisma.message.findMany({
      where: { conversationId },
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
