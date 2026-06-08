import { Injectable } from '@nestjs/common';
import { Conversation, Participant, Bot, Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { ChannelType, ThreadType } from '@/shared/types';

@Injectable()
export class ConversationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findBotByExternal(channel: ChannelType, externalId: string): Promise<Bot | null> {
    return this.prisma.bot.findUnique({
      where: { channel_externalId: { channel, externalId } },
    });
  }

  async findParticipantProfile(
    channel: ChannelType,
    botExternalId: string,
    userId: string,
  ): Promise<{ displayName: string | null; avatar: string | null } | null> {
    return this.prisma.participant.findFirst({
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
  }

  /** Lấy displayName ưu tiên từ Contact (biệt danh > zaloName) */
  async findContactDisplayName(
    channel: ChannelType,
    botExternalId: string,
    userId: string,
  ): Promise<{ displayName: string | null; avatar: string | null } | null> {
    const bot = await this.prisma.bot.findUnique({
      where: { channel_externalId: { channel, externalId: botExternalId } },
      select: { id: true },
    });
    if (!bot) return null;

    const contact = await this.prisma.contact.findFirst({
      where: { botId: bot.id, externalId: userId },
      select: { name: true, avatar: true },
    });

    if (!contact) return null;
    return { displayName: contact.name, avatar: contact.avatar };
  }

  async upsertConversationFromInbound(input: {
    botId: number;
    threadExternalId: string;
    threadType: ThreadType;
    title: string | null;
    avatar: string | null;
    timestamp: Date;
    text: string | null;
    senderExternalId: string;
    senderName: string | null;
    senderAvatar: string | null;
    isSelf?: boolean;
    memberCount?: number;
  }): Promise<Conversation> {
    const isSelf = input.isSelf ?? false;
    const isGroup = input.threadType === 'group';

    const existing = await this.prisma.conversation.findUnique({
      where: {
        botId_threadExternalId: {
          botId: input.botId,
          threadExternalId: input.threadExternalId,
        },
      },
      select: { metadata: true },
    });

    const existingMeta = (existing?.metadata as Record<string, any>) || {};
    const nextMeta = {
      ...existingMeta,
      ...(input.memberCount !== undefined ? { memberCount: input.memberCount } : {}),
    };

    return this.prisma.conversation.upsert({
      where: {
        botId_threadExternalId: {
          botId: input.botId,
          threadExternalId: input.threadExternalId,
        },
      },
      create: {
        botId: input.botId,
        threadType: input.threadType,
        threadExternalId: input.threadExternalId,
        title: input.title || (isGroup ? 'Zalo Group' : 'Stranger'),
        avatar: input.avatar,
        lastMessageAt: input.timestamp,
        lastMessageText: input.text,
        lastMessageSenderId: input.senderExternalId,
        lastMessageSenderName: input.senderName,
        lastMessageSenderAvatar: input.senderAvatar,
        lastMessageDirection: isSelf ? 'out' : 'in',
        unread: isSelf ? 0 : 1,
        metadata: nextMeta,
      },
      update: {
        ...(input.avatar && { avatar: input.avatar }),
        ...(input.title && { title: input.title }),
        lastMessageAt: input.timestamp,
        lastMessageText: input.text,
        lastMessageSenderId: input.senderExternalId,
        lastMessageSenderName: input.senderName,
        lastMessageSenderAvatar: input.senderAvatar,
        lastMessageDirection: isSelf ? 'out' : 'in',
        unread: isSelf ? 0 : { increment: 1 },
        metadata: nextMeta,
      },
    });
  }

  async upsertParticipant(input: {
    conversationId: number;
    externalId: string;
    displayName: string | null;
    avatar: string | null;
    isBot: boolean;
  }): Promise<Participant> {
    return this.prisma.participant.upsert({
      where: {
        conversationId_externalId: {
          conversationId: input.conversationId,
          externalId: input.externalId,
        },
      },
      create: {
        conversationId: input.conversationId,
        externalId: input.externalId,
        displayName: input.displayName,
        avatar: input.avatar,
        isBot: input.isBot,
      },
      update: {
        ...(input.displayName ? { displayName: input.displayName } : {}),
        ...(input.avatar ? { avatar: input.avatar } : {}),
      },
    });
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

  async findManyByBot(botId: number, limit: number, cursor?: number): Promise<Conversation[]> {
    return this.prisma.conversation.findMany({
      where: { botId },
      orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
      take: limit,
      ...(cursor !== undefined && {
        cursor: { id: cursor },
        skip: 1,
      }),
    });
  }

  async findById(id: number): Promise<Conversation | null> {
    return this.prisma.conversation.findUnique({
      where: { id },
      include: {
        participants: {
          orderBy: [{ isBot: 'asc' }, { id: 'asc' }],
        },
      },
    });
  }

  async findManyParticipants(conversationId: number, limit: number, cursor?: number): Promise<Participant[]> {
    return this.prisma.participant.findMany({
      where: { conversationId },
      orderBy: [{ isBot: 'asc' }, { id: 'asc' }],
      take: limit,
      ...(cursor !== undefined && {
        cursor: { id: cursor },
        skip: 1,
      }),
    });
  }

  async findMetadata(id: number): Promise<Prisma.JsonValue | null> {
    const res = await this.prisma.conversation.findUnique({
      where: { id },
      select: { metadata: true },
    });
    return res?.metadata ?? null;
  }

  async updateMetadata(id: number, metadata: Prisma.InputJsonValue): Promise<Conversation> {
    return this.prisma.conversation.update({
      where: { id },
      data: { metadata },
    });
  }

  async updateUnread(id: number, unread: number): Promise<Conversation> {
    return this.prisma.conversation.update({
      where: { id },
      data: { unread },
    });
  }

  async updateAutoReply(id: number, autoReplyEnabled: boolean): Promise<Conversation> {
    return this.prisma.conversation.update({
      where: { id },
      data: { autoReplyEnabled },
    });
  }
}
