import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BotService } from '@/bot/bot.service';
import { ChannelType } from '@/shared/types';
import { Contact, FriendRequest } from '@prisma/client';
import { ZaloZcaService } from '@/channels/zalo/zalo-zca.service';
import { DOMAIN_EVENTS } from '@/shared/events/domain-events';
import { ContactsRepository } from './repositories/contacts.repository';
import { ConversationRepository } from '@/conversations/repositories/conversation.repository';

@Injectable()
export class ContactsService {
  constructor(
    private readonly repo: ContactsRepository,
    private readonly convoRepo: ConversationRepository,
    private readonly bots: BotService,
    private readonly zca: ZaloZcaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getContacts(channel: ChannelType, externalId: string): Promise<Contact[]> {
    const bot = await this.bots.getByExternal(channel, externalId);
    if (channel === ChannelType.zalo) {
      try {
        const onlineIds = await this.zca.getFriendOnlines(bot.externalId);
        await this.repo.setAllOfflineByBot(bot.id);
        if (onlineIds.length > 0) {
          await this.repo.setOnlineByExternalIds(bot.id, onlineIds);
        }
      } catch (err) {
        console.error('Failed to sync friend online status:', err);
      }
    }
    return this.repo.findManyByBot(bot.id);
  }

  async getFriendRequests(channel: ChannelType, externalId: string): Promise<FriendRequest[]> {
    const bot = await this.bots.getByExternal(channel, externalId);
    return this.repo.findManyRequestsByBot(bot.id);
  }

  async getSentFriendRequests(channel: ChannelType, externalId: string): Promise<any[]> {
    if (channel !== ChannelType.zalo) {
      throw new Error('Get sent friend requests is only supported for Zalo');
    }
    const bot = await this.bots.getByExternal(channel, externalId);
    return this.zca.getSentFriendRequests(bot.externalId);
  }

  async getFriendRecommendations(channel: ChannelType, externalId: string): Promise<any[]> {
    if (channel !== ChannelType.zalo) {
      throw new Error('Get friend recommendations is only supported for Zalo');
    }
    const bot = await this.bots.getByExternal(channel, externalId);
    return this.zca.getFriendRecommendations(bot.externalId);
  }

  async acceptFriendRequest(channel: ChannelType, externalId: string, requestId: number): Promise<Contact> {
    const bot = await this.bots.getByExternal(channel, externalId);
    const request = await this.repo.findRequestByIdAndBot(requestId, bot.id);
    if (!request) {
      throw new NotFoundException(`Friend request ${requestId} not found`);
    }

    if (channel === ChannelType.zalo) {
      await this.zca.acceptFriendRequest(bot.externalId, request.externalId);
    }

    return this.repo.transaction(async (tx) => {
      // Access prisma through the tx client for atomicity
      const contact = await tx.contact.create({
        data: {
          botId: bot.id,
          externalId: request.externalId,
          name: request.name,
          avatar: request.avatar,
          isFriend: true,
        },
      });

      await tx.friendRequest.delete({
        where: { id: requestId },
      });

      return contact;
    });
  }

  async declineFriendRequest(channel: ChannelType, externalId: string, requestId: number): Promise<{ ok: boolean }> {
    const bot = await this.bots.getByExternal(channel, externalId);
    const request = await this.repo.findRequestByIdAndBot(requestId, bot.id);
    if (!request) {
      throw new NotFoundException(`Friend request ${requestId} not found`);
    }

    if (channel === ChannelType.zalo) {
      await this.zca.rejectFriendRequest(bot.externalId, request.externalId);
    }

    await this.repo.deleteRequest(requestId);
    return { ok: true };
  }

  async findUser(channel: ChannelType, externalId: string, phone: string): Promise<{
    uid: string;
    zaloName: string;
    displayName: string;
    avatar: string | null;
    isFriend: boolean;
  } | null> {
    if (channel !== ChannelType.zalo) {
      throw new Error('Search by phone is only supported for Zalo');
    }
    const bot = await this.bots.getByExternal(channel, externalId);
    const result = await this.zca.findUser(bot.externalId, phone);
    if (!result) return null;

    // Check if they are already a friend
    const isFriend = await this.repo.findFirstFriendByBotAndExternal(bot.id, result.uid);

    return {
      uid: result.uid,
      zaloName: result.zalo_name,
      displayName: result.display_name,
      avatar: result.avatar || null,
      isFriend: !!isFriend,
    };
  }

  async sendFriendRequest(
    channel: ChannelType,
    externalId: string,
    targetUserId: string,
    message: string,
  ) {
    if (channel !== ChannelType.zalo) {
      throw new Error('Add friend by ID is only supported for Zalo');
    }
    const bot = await this.bots.getByExternal(channel, externalId);
    const success = await this.zca.sendFriendRequest(bot.externalId, targetUserId, message || 'Xin chào!');
    return { success };
  }

  async cancelSentFriendRequest(
    channel: ChannelType,
    externalId: string,
    targetUserId: string,
  ) {
    if (channel !== ChannelType.zalo) {
      throw new Error('Revoke friend request is only supported for Zalo');
    }
    const bot = await this.bots.getByExternal(channel, externalId);
    const result = await this.zca.undoFriendRequest(bot.externalId, targetUserId);
    return { ok: true, result };
  }

  async removeFriend(
    channel: ChannelType,
    externalId: string,
    targetUserId: string,
  ) {
    const bot = await this.bots.getByExternal(channel, externalId);
    const contact = await this.repo.findFirstByBotAndExternalOrId(bot.id, targetUserId);
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }
    if (channel === ChannelType.zalo) {
      await this.zca.removeFriend(bot.externalId, contact.externalId);
    }
    await this.repo.delete(contact.id);
    return { ok: true };
  }

  async changeFriendAlias(
    channel: ChannelType,
    externalId: string,
    friendId: string,
    alias: string,
  ) {
    const bot = await this.bots.getByExternal(channel, externalId);
    if (channel === ChannelType.zalo) {
      await this.zca.changeFriendAlias(bot.externalId, alias, friendId);
    }
    // Lưu biệt danh vào trường name trong DB
    await this.repo.updateManyByBotAndExternal(bot.id, friendId, { name: alias });
    // Cập nhật title của conversation tương ứng
    const conversation = await this.convoRepo.findByBotAndThread(bot.id, friendId);
    if (conversation) {
      await this.convoRepo.update(conversation.id, { title: alias });
      // Emit socket event để FE cập nhật tên trong list người dùng
      this.eventEmitter.emit(DOMAIN_EVENTS.ConversationRenamed, {
        customerId: bot.customerId,
        conversationId: conversation.id,
        threadExternalId: friendId,
        title: alias,
      });
    }
    return { ok: true };
  }

  async removeFriendAlias(
    channel: ChannelType,
    externalId: string,
    friendId: string,
  ) {
    const bot = await this.bots.getByExternal(channel, externalId);
    // Lấy contact để biết zaloName
    const contact = await this.repo.findFirstByBotAndExternal(bot.id, friendId);
    if (!contact) throw new NotFoundException('Contact not found');
    if (channel === ChannelType.zalo) {
      await this.zca.removeFriendAlias(bot.externalId, friendId);
    }
    // Khôi phục tên về zaloName nếu có
    const restoreName = (contact as any).zaloName || contact.name;
    await this.repo.update(contact.id, { name: restoreName });
    // Cập nhật title của conversation tương ứng
    const conversation = await this.convoRepo.findByBotAndThread(bot.id, friendId);
    if (conversation) {
      await this.convoRepo.update(conversation.id, { title: restoreName });
      // Emit socket event để FE cập nhật tên trong list
      this.eventEmitter.emit(DOMAIN_EVENTS.ConversationRenamed, {
        customerId: bot.customerId,
        conversationId: conversation.id,
        threadExternalId: friendId,
        title: restoreName,
      });
    }
    return { ok: true, name: restoreName };
  }

  async getOrCreateConversation(
    channel: ChannelType,
    externalId: string,
    targetUserId: string,
    displayName: string,
    avatar: string | null,
  ) {
    const bot = await this.bots.getByExternal(channel, externalId);

    let threadExternalId = targetUserId;
    if (channel === ChannelType.zalo && /^\d+$/.test(targetUserId) && targetUserId.length < 10) {
      const contact = await this.repo.findFirstByBotAndExternalOrId(bot.id, targetUserId);
      if (contact) {
        threadExternalId = contact.externalId;
      }
    }

    const conversation = await this.convoRepo.upsertByBotAndThread({
      botId: bot.id,
      threadExternalId,
      threadType: 'user',
      title: displayName,
      avatar: avatar,
    });

    await this.convoRepo.upsertParticipant({
      conversationId: conversation.id,
      externalId: threadExternalId,
      displayName,
      avatar,
      isBot: false,
    });

    return conversation;
  }
}
