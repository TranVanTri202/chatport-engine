import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Bot, Conversation, Prisma } from '@prisma/client';
import { ChannelType, ThreadType } from '@/shared/types';
import { InboundMessageDto } from '@/messaging/dto/inbound-message.dto';
import { ZaloZcaService, ZaloUserProfile, ZaloGroupInfo, ZaloMemberInfo } from '@/channels/zalo/zalo-zca.service';
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
  ): Promise<ZaloUserProfile | null> {
    if (channel !== 'zalo') return null;

    // Ưu tiên #1: Contact.name (biệt danh người dùng đặt)
    const contactProfile = await this.repo.findContactDisplayName(channel, botExternalId, userId);
    if (contactProfile?.displayName) {
      return contactProfile;
    }

    // Ưu tiên #2: Participant.displayName đã lưu
    const existingParticipant = await this.repo.findParticipantProfile(channel, botExternalId, userId);
    if (existingParticipant?.displayName) {
      return existingParticipant;
    }

    // Ưu tiên #3: ZCA API (lần đầu gặp)
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

    // Fire all independent profile/group lookups in parallel instead of sequentially.
    // User chat: sender profile + other user profile.
    // Group chat: sender profile + group info from Zalo.
    // Non-Zalo channels: resolveUserProfile returns null immediately (no-op).
    let senderProfile: ZaloUserProfile | null = null;
    let otherProfile: ZaloUserProfile | null = null;
    let groupInfo: ZaloGroupInfo | null = null;

    if (msg.threadType === 'user') {
      [senderProfile, otherProfile] = await Promise.all([
        this.resolveUserProfile(msg.channel, msg.botExternalId, msg.senderExternalId),
        this.resolveUserProfile(msg.channel, msg.botExternalId, msg.threadId),
      ]);
    } else if (msg.threadType === 'group') {
      const promises: [Promise<any>, Promise<any>] = [
        this.resolveUserProfile(msg.channel, msg.botExternalId, msg.senderExternalId),
        Promise.resolve(null),
      ];
      if (msg.channel === ChannelType.zalo) {
        promises[1] = this.zaloZcaService.getGroupInfo(msg.botExternalId, msg.threadId);
      }
      [senderProfile, groupInfo] = await Promise.all(promises);
    } else {
      senderProfile = await this.resolveUserProfile(
        msg.channel,
        msg.botExternalId,
        msg.senderExternalId,
      );
    }

    const lastMessageSenderName = senderProfile?.displayName ?? msg.senderName ?? null;
    const lastMessageSenderAvatar = senderProfile?.avatar ?? null;

    let convoTitle: string | null = null;
    let convoAvatar: string | null = null;
    let memberCount: number | undefined = undefined;

    if (msg.threadType === 'user') {
      // In direct chat, the conversation belongs to the other person (threadId)
      convoTitle = otherProfile?.displayName ?? (msg.isSelf ? null : msg.senderName) ?? null;
      convoAvatar = otherProfile?.avatar ?? null;
    } else if (msg.threadType === 'group' && groupInfo) {
      convoTitle = groupInfo.name;
      convoAvatar = groupInfo.avt;
      memberCount = groupInfo.totalMember;
    }

    let lastMsgText = msg.text ?? '';
    if (!lastMsgText.trim()) {
      if (msg.type === 'image') {
        lastMsgText = '[Hình ảnh]';
      } else if (msg.type === 'video') {
        lastMsgText = '[Video]';
      } else if (msg.type === 'file') {
        lastMsgText = '[Tệp tin]';
      } else if (msg.type === 'voice') {
        lastMsgText = '[Tin nhắn thoại]';
      } else if (msg.type === 'sticker') {
        lastMsgText = '[Nhãn dán]';
      } else if (msg.type === 'link') {
        lastMsgText = '[Liên kết]';
      } else if (msg.type === 'pin') {
        lastMsgText = '[Tin ghim]';
      } else if (msg.type !== 'chat' && msg.type !== 'webchat') {
        lastMsgText = '[Tin nhắn]';
      }
    }

    const conversation = await this.repo.upsertConversationFromInbound({
      botId: bot.id,
      threadExternalId: msg.threadId,
      threadType: msg.threadType,
      title: convoTitle,
      avatar: convoAvatar,
      timestamp: new Date(msg.timestamp),
      text: lastMsgText || null,
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
    const bot = await this.repo.findBotByConversationId(id);

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
    const convo = await this.repo.findWithBot(input.conversationId);

    if (convo && convo.bot.channel === 'zalo' && convo.threadType === 'group') {
      const metadata = (convo.metadata as Record<string, any>) || {};
      const lastSyncedAt = metadata.lastSyncedAt || 0;
      const now = Date.now();

      // Chỉ đồng bộ lại từ Zalo nếu lần đồng bộ trước đó đã quá 2 phút (120s)
      if (now - lastSyncedAt > 120000) {
        try {
          const groupInfo = await this.zaloZcaService.getGroupInfo(
            convo.bot.externalId,
            convo.threadExternalId,
          );

          if (groupInfo) {
            const newMetadata = {
              ...metadata,
              memberCount: groupInfo.totalMember,
              creatorId: groupInfo.creatorId,
              adminIds: groupInfo.adminIds || [],
              settings: groupInfo.setting || {},
              lastSyncedAt: now,
            };

            await this.repo.update(convo.id, {
              title: groupInfo.name || convo.title,
              avatar: groupInfo.avt || convo.avatar,
              metadata: newMetadata,
            });

            let currentMems = groupInfo.currentMems || [];
            if (currentMems.length === 0 && groupInfo.memVerList && groupInfo.memVerList.length > 0) {
              try {
                const memberIds = groupInfo.memVerList.map((m: string) => m.split('_')[0]);
                const memsRes = await this.zaloZcaService.getGroupMembersInfo(convo.bot.externalId, memberIds);
                if (memsRes?.profiles) {
                  currentMems = (Object.values(memsRes.profiles) as ZaloMemberInfo[]).map((p) => ({
                    id: p.id,
                    dName: p.displayName || p.zaloName || 'Zalo Member',
                    avatar: p.avatar,
                  }));
                }
              } catch (err) {
                console.warn('Failed to fetch group members info via getGroupMembersInfo:', err);
              }
            }
            
            const dbParticipants = await this.repo.findAllParticipants(convo.id);

            const upsertPromises = currentMems.map((mem: ZaloMemberInfo) => {
              const externalId = mem.id;
              const displayName = mem.dName || mem.zaloName || 'Zalo Member';
              const avatar = mem.avatar || null;
              const isBot = externalId === convo.bot.externalId;

              return this.repo.upsertParticipant({
                conversationId: convo.id,
                externalId,
                displayName,
                avatar,
                isBot,
              });
            });
            await Promise.all(upsertPromises);

            const currentUids = new Set(currentMems.map((m: ZaloMemberInfo) => m.id));
            const uidsToRemove = dbParticipants
              .map((p) => p.externalId)
              .filter((uid) => !currentUids.has(uid));

            if (uidsToRemove.length > 0) {
              await this.repo.deleteParticipantsByExternalIds(convo.id, uidsToRemove);
            }
          }
        } catch (err) {
          console.error(`Failed to sync group participants for convo ${convo.id}:`, err);
        }
      }
    }

    const take = input.limit ?? 1000;
    const rows = await this.repo.findManyParticipants(input.conversationId, take + 1, input.cursor);
    
    const metadata = await this.repo.findMetadata(input.conversationId);
    const meta = (metadata as Record<string, any>) || {};
    const creatorId = meta.creatorId || '';
    const adminIds = meta.adminIds || [];

    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;

    const mappedItems = items.map((p) => {
      const isOwner = p.externalId === creatorId;
      const isAdmin = adminIds.includes(p.externalId) || isOwner;
      const role = isOwner ? 'owner' : (adminIds.includes(p.externalId) ? 'deputy' : 'member');
      return {
        ...p,
        isOwner,
        isAdmin,
        role,
      };
    });

    return {
      items: mappedItems,
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

    try {
      const convo = await this.repo.findWithBot(id);
      if (convo && convo.bot.channel === 'zalo') {
        const lastInboundMsg = await this.repo.findLastMessageByDirection(id, 'in');
        if (lastInboundMsg && lastInboundMsg.raw) {
          const threadTypeNum = convo.threadType === 'group' ? 1 : 0;
          void this.zaloZcaService.sendSeenEvent(
            convo.bot.externalId,
            convo.threadExternalId,
            threadTypeNum,
            lastInboundMsg.raw,
          );
        }
      }
    } catch (err) {
      console.error(`Failed to send seen event for conversation ${id}:`, err);
    }
  }

  async updateAutoReply(id: number, autoReplyEnabled: boolean): Promise<void> {
    await this.repo.updateAutoReply(id, autoReplyEnabled);
  }

  private async getGroupConversationOrThrow(id: number): Promise<NonNullable<Awaited<ReturnType<ConversationRepository['findWithBot']>>>> {
    const convo = await this.repo.findWithBot(id);
    if (!convo) {
      throw new NotFoundException(`Conversation ${id} not found`);
    }
    if (convo.bot.channel !== 'zalo' || convo.threadType !== 'group') {
      throw new BadRequestException('Operation only supported for Zalo group chats');
    }
    return convo;
  }

  async createGroup(botExternalId: string, name: string, members: string[], avatar?: string): Promise<Conversation> {
    const bot = await this.getBotByExternal(ChannelType.zalo, botExternalId);

    let avatarSource: any = undefined;
    if (avatar) {
      const parseAttachment = (url: string) => {
        if (url.startsWith('data:')) {
          const match = url.match(/^data:([^;]+);name=([^;]+);base64,(.+)$/);
          if (match) {
            const [, mimeType, encodedName, base64Data] = match;
            const fileName = decodeURIComponent(encodedName);
            const buffer = Buffer.from(base64Data, 'base64');
            return {
              data: buffer,
              filename: fileName as `${string}.${string}`,
              metadata: {
                totalSize: buffer.length,
              },
            };
          }
        }
        return url;
      };
      avatarSource = parseAttachment(avatar);
    }

    const res = await this.zaloZcaService.createGroup(botExternalId, {
      name,
      members,
      ...(avatarSource ? { avatarSource } : {}),
    });

    if (!res?.groupId) {
      throw new Error('Failed to create group on Zalo: No groupId returned');
    }
    const groupId = res.groupId;

    let finalAvatar: string | null = null;
    try {
      if (avatarSource) {
        const groupInfo = await this.zaloZcaService.getGroupInfo(botExternalId, groupId);
        if (groupInfo?.avt) {
          finalAvatar = groupInfo.avt;
        }
      }
    } catch (err) {
      console.warn('Failed to fetch new group info immediately for avatar:', err);
    }

    // Use getOrCreate to ensure row exists, then update the full record
    const existing = await this.repo.getOrCreate({
      botId: bot.id,
      threadType: ThreadType.group,
      threadExternalId: groupId,
    });

    return this.repo.update(existing.id, {
      title: name || 'Zalo Group',
      avatar: finalAvatar || undefined,
      unread: 0,
      lastMessageAt: new Date(),
      metadata: {
        memberCount: members.length + 1,
      },
    });
  }

  async leaveGroup(id: number): Promise<void> {
    const convo = await this.getGroupConversationOrThrow(id);
    await this.zaloZcaService.leaveGroup(convo.bot.externalId, convo.threadExternalId);
    
    const metadata = (convo.metadata as Record<string, any>) || {};
    await this.repo.update(id, {
      metadata: {
        ...metadata,
        isBotParticipant: false,
        memberCount: 0,
      },
    });
  }

  async disperseGroup(id: number): Promise<void> {
    const convo = await this.getGroupConversationOrThrow(id);
    await this.zaloZcaService.disperseGroup(convo.bot.externalId, convo.threadExternalId);
    await this.repo.delete(id);
  }

  async inviteMember(id: number, userId: string): Promise<void> {
    const convo = await this.getGroupConversationOrThrow(id);
    await this.zaloZcaService.inviteUserToGroups(convo.bot.externalId, convo.threadExternalId, userId);
  }

  async removeMember(id: number, userId: string): Promise<void> {
    const convo = await this.getGroupConversationOrThrow(id);
    await this.zaloZcaService.removeUserFromGroup(convo.bot.externalId, convo.threadExternalId, userId);
    await this.repo.deleteParticipantsByExternalIds(id, [userId]);
  }

  async promoteDeputy(id: number, userId: string): Promise<void> {
    const convo = await this.getGroupConversationOrThrow(id);
    await this.zaloZcaService.addGroupDeputy(convo.bot.externalId, convo.threadExternalId, userId);
    
    const metadata = (convo.metadata as Record<string, any>) || {};
    const adminIds = metadata.adminIds || [];
    if (!adminIds.includes(userId)) {
      adminIds.push(userId);
    }
    await this.repo.update(id, {
      metadata: {
        ...metadata,
        adminIds,
      },
    });
  }

  async demoteDeputy(id: number, userId: string): Promise<void> {
    const convo = await this.getGroupConversationOrThrow(id);
    await this.zaloZcaService.removeGroupDeputy(convo.bot.externalId, convo.threadExternalId, userId);
    
    const metadata = (convo.metadata as Record<string, any>) || {};
    let adminIds = metadata.adminIds || [];
    adminIds = adminIds.filter((aid: string) => aid !== userId);
    await this.repo.update(id, {
      metadata: {
        ...metadata,
        adminIds,
      },
    });
  }

  async changeOwner(id: number, userId: string): Promise<void> {
    const convo = await this.getGroupConversationOrThrow(id);
    await this.zaloZcaService.changeGroupOwner(convo.bot.externalId, convo.threadExternalId, userId);
    
    const metadata = (convo.metadata as Record<string, any>) || {};
    await this.repo.update(id, {
      metadata: {
        ...metadata,
        creatorId: userId,
      },
    });
  }

  async updateGroupSettings(id: number, settings: Record<string, unknown>): Promise<void> {
    const convo = await this.getGroupConversationOrThrow(id);
    await this.zaloZcaService.updateGroupSettings(convo.bot.externalId, convo.threadExternalId, settings);
    
    const metadata = (convo.metadata as Record<string, any>) || {};
    const currentSettings = metadata.settings || {};
    await this.repo.update(id, {
      metadata: {
        ...metadata,
        settings: {
          ...currentSettings,
          ...settings,
        },
      },
    });
  }

  async getPendingMembers(id: number): Promise<any> {
    const convo = await this.getGroupConversationOrThrow(id);
    return this.zaloZcaService.getPendingGroupMembers(convo.bot.externalId, convo.threadExternalId);
  }

  async reviewPendingMember(id: number, userId: string, approve: boolean): Promise<void> {
    const convo = await this.getGroupConversationOrThrow(id);
    await this.zaloZcaService.reviewPendingMemberRequest(convo.bot.externalId, convo.threadExternalId, {
      members: userId,
      isApprove: approve,
    });
  }

  async changeGroupName(id: number, title: string): Promise<void> {
    const convo = await this.getGroupConversationOrThrow(id);
    await this.zaloZcaService.changeGroupName(convo.bot.externalId, convo.threadExternalId, title);
    await this.repo.update(id, { title });
  }

  async changeGroupAvatar(id: number, avatar: string): Promise<void> {
    const convo = await this.getGroupConversationOrThrow(id);
    await this.zaloZcaService.changeGroupAvatar(convo.bot.externalId, convo.threadExternalId, avatar);
    
    try {
      const groupInfo = await this.zaloZcaService.getGroupInfo(convo.bot.externalId, convo.threadExternalId);
      if (groupInfo?.avt) {
        await this.repo.update(id, { avatar: groupInfo.avt });
      }
    } catch (err) {
      console.warn('Failed to fetch updated avatar immediately:', err);
    }
  }

  async updateMute(id: number, isMuted: boolean): Promise<void> {
    const convo = await this.repo.findWithBot(id);
    if (!convo) {
      throw new NotFoundException(`Conversation ${id} not found`);
    }

    if (convo.bot.channel === 'zalo') {
      try {
        const threadTypeNum = convo.threadType === 'group' ? 1 : 0;
        await this.zaloZcaService.setMute(
          convo.bot.externalId,
          convo.threadExternalId,
          threadTypeNum,
          isMuted,
        );
      } catch (err) {
        console.warn(`Failed to set mute status on Zalo: ${(err as Error).message}`);
      }
    }

    const metadata = (convo.metadata as Record<string, any>) || {};
    await this.repo.update(id, {
      metadata: {
        ...metadata,
        isMuted,
      },
    });
  }
}
