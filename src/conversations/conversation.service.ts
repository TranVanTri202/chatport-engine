import { Injectable, NotFoundException } from '@nestjs/common';
import { Bot, Conversation, Prisma } from '@prisma/client';
import { ChannelType, ThreadType } from '@/shared/types';
import { InboundMessageDto } from '@/messaging/dto/inbound-message.dto';
import { ZaloZcaService } from '@/channels/zalo/zalo-zca.service';
import { ConversationRepository } from './repositories/conversation.repository';

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
    private readonly repo: ConversationRepository,
    private readonly zaloZcaService: ZaloZcaService,
  ) {}

  /** Resolve the Bot row addressed by (channel, botExternalId). */
  async getBotByExternal(channel: ChannelType, externalId: string): Promise<Bot> {
    const bot = await this.repo.findBotByExternal(channel, externalId);
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

    const existingParticipant = await this.repo.findParticipantProfile(channel, botExternalId, userId);

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

    let convoTitle: string | null = null;
    let convoAvatar: string | null = null;
    let memberCount: number | undefined = undefined;

    if (msg.threadType === 'user') {
      // In direct chat, the conversation belongs to the other person (threadId)
      const otherProfile = await this.resolveUserProfile(msg.channel, msg.botExternalId, msg.threadId);
      convoTitle = otherProfile?.displayName ?? (msg.isSelf ? null : msg.senderName) ?? null;
      convoAvatar = otherProfile?.avatar ?? null;
    } else if (msg.threadType === 'group') {
      if (msg.channel === ChannelType.zalo) {
        const groupInfo = await this.zaloZcaService.getGroupInfo(msg.botExternalId, msg.threadId);
        if (groupInfo) {
          convoTitle = groupInfo.name;
          convoAvatar = groupInfo.avt;
          memberCount = groupInfo.totalMember;
        }
      }
    }

    const conversation = await this.repo.upsertConversationFromInbound({
      botId: bot.id,
      threadExternalId: msg.threadId,
      threadType: msg.threadType,
      title: convoTitle,
      avatar: convoAvatar,
      timestamp: new Date(msg.timestamp),
      text: msg.text ?? null,
      senderExternalId: msg.senderExternalId,
      senderName: lastMessageSenderName,
      senderAvatar: lastMessageSenderAvatar,
      isSelf: msg.isSelf,
      memberCount,
    });

    await this.repo.upsertParticipant({
      conversationId: conversation.id,
      externalId: msg.senderExternalId,
      displayName: senderProfile?.displayName ?? msg.senderName ?? null,
      avatar: senderProfile?.avatar ?? null,
      isBot: msg.senderExternalId === bot.externalId,
    });

    return { conversation, bot };
  }

  async getOrCreate(input: {
    botId: number;
    threadType: ThreadType;
    threadExternalId: string;
  }): Promise<Conversation> {
    return this.repo.getOrCreate(input);
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
    const rows = await this.repo.findManyByBot(bot.id, take + 1, input.cursor);
    
    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;
    return {
      items,
      nextCursor: hasMore ? items[items.length - 1]!.id : null,
    };
  }

  async getById(id: number): Promise<ConversationDetailItem> {
    const c = await this.repo.findById(id);
    if (!c) throw new NotFoundException(`Conversation ${id} not found`);

    // Sync pinned messages if Zalo
    const bot = await (this.repo as any).prisma.bot.findUnique({
      where: { id: c.botId },
    });

    if (bot && bot.channel === 'zalo') {
      const metadata = (c.metadata as Record<string, any>) || {};
      const now = Date.now();
      const lastSync = metadata.lastPinnedSyncAt ? Number(metadata.lastPinnedSyncAt) : 0;

      // Sync if pinnedMessages is not defined or 10 minutes cache expired
      if (!metadata.pinnedMessages || now - lastSync > 600000) {
        try {
          const pins = await this.zaloZcaService.getPinnedMessages(
            bot.externalId,
            c.threadExternalId,
            c.threadType === 'group' ? 'group' : 'user',
          );

          const updated = await this.repo.updateMetadata(c.id, {
            ...metadata,
            pinnedMessages: pins,
            lastPinnedSyncAt: now,
          });

          c.metadata = updated.metadata;
        } catch (err) {
          console.error(`Failed to sync pinned messages for conversation ${id}:`, err);
        }
      }
    }

    return c as ConversationDetailItem;
  }

  async listParticipants(input: {
    conversationId: number;
    limit?: number;
    cursor?: number;
  }) {
    const take = input.limit ?? 30;
    const rows = await this.repo.findManyParticipants(input.conversationId, take + 1, input.cursor);
    
    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;
    return {
      items,
      nextCursor: hasMore ? items[items.length - 1]!.id : null,
    };
  }

  async getSummary(id: number): Promise<string | null> {
    const metadata = await this.repo.findMetadata(id);
    if (!metadata || Array.isArray(metadata) || typeof metadata !== 'object') return null;

    const summary = (metadata as Prisma.JsonObject).summary;
    return typeof summary === 'string' && summary.trim().length > 0 ? summary.trim() : null;
  }

  async setSummary(id: number, summary: string): Promise<void> {
    const metadata = await this.repo.findMetadata(id);
    const nextMetadata = (!metadata || Array.isArray(metadata) || typeof metadata !== 'object')
      ? {}
      : { ...(metadata as Prisma.JsonObject) };
    nextMetadata.summary = summary;

    await this.repo.updateMetadata(id, nextMetadata);
  }

  async getContextSnapshot(id: number): Promise<{ summary: string | null }> {
    return { summary: await this.getSummary(id) };
  }

  async updateContextSnapshot(id: number, summary: string): Promise<void> {
    await this.setSummary(id, summary);
  }

  async markRead(id: number): Promise<void> {
    await this.repo.updateUnread(id, 0);
  }

  async updateAutoReply(id: number, autoReplyEnabled: boolean): Promise<void> {
    await this.repo.updateAutoReply(id, autoReplyEnabled);
  }
}
