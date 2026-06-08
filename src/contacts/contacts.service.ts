import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { BotService } from '@/bot/bot.service';
import { ChannelType } from '@/shared/types';
import { Contact, FriendRequest } from '@prisma/client';
import { ZaloZcaService } from '@/channels/zalo/zalo-zca.service';
import { DOMAIN_EVENTS } from '@/shared/events/domain-events';

@Injectable()
export class ContactsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bots: BotService,
    private readonly zca: ZaloZcaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getContacts(channel: ChannelType, externalId: string): Promise<Contact[]> {
    const bot = await this.bots.getByExternal(channel, externalId);
    return this.prisma.contact.findMany({
      where: { botId: bot.id },
      orderBy: { name: 'asc' },
    });
  }

  async getFriendRequests(channel: ChannelType, externalId: string): Promise<FriendRequest[]> {
    const bot = await this.bots.getByExternal(channel, externalId);
    return this.prisma.friendRequest.findMany({
      where: { botId: bot.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSentFriendRequests(channel: ChannelType, externalId: string): Promise<any[]> {
    if (channel !== ChannelType.zalo) {
      throw new Error('Get sent friend requests is only supported for Zalo');
    }
    const bot = await this.bots.getByExternal(channel, externalId);
    return this.zca.getSentFriendRequests(bot.externalId);
  }

  async acceptFriendRequest(channel: ChannelType, externalId: string, requestId: number): Promise<Contact> {
    const bot = await this.bots.getByExternal(channel, externalId);
    const request = await this.prisma.friendRequest.findFirst({
      where: { id: requestId, botId: bot.id },
    });
    if (!request) {
      throw new NotFoundException(`Friend request ${requestId} not found`);
    }

    if (channel === ChannelType.zalo) {
      await this.zca.acceptFriendRequest(bot.externalId, request.externalId);
    }

    return this.prisma.$transaction(async (tx) => {
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
    const request = await this.prisma.friendRequest.findFirst({
      where: { id: requestId, botId: bot.id },
    });
    if (!request) {
      throw new NotFoundException(`Friend request ${requestId} not found`);
    }

    if (channel === ChannelType.zalo) {
      await this.zca.rejectFriendRequest(bot.externalId, request.externalId);
    }

    await this.prisma.friendRequest.delete({
      where: { id: requestId },
    });

    return { ok: true };
  }

  async findUser(channel: ChannelType, externalId: string, phone: string) {
    if (channel !== ChannelType.zalo) {
      throw new Error('Search by phone is only supported for Zalo');
    }
    const bot = await this.bots.getByExternal(channel, externalId);
    const result = await this.zca.findUser(bot.externalId, phone);
    if (!result) return null;

    // Check if they are already a friend
    const isFriend = await this.prisma.contact.findFirst({
      where: {
        botId: bot.id,
        externalId: result.uid,
        isFriend: true,
      },
    });

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
    const orConditions: any[] = [{ externalId: targetUserId }];
    if (/^\d+$/.test(targetUserId)) {
      orConditions.push({ id: parseInt(targetUserId, 10) });
    }
    const contact = await this.prisma.contact.findFirst({
      where: {
        botId: bot.id,
        OR: orConditions,
      },
    });
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }
    if (channel === ChannelType.zalo) {
      await this.zca.removeFriend(bot.externalId, contact.externalId);
    }
    await this.prisma.contact.delete({
      where: { id: contact.id },
    });
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
    await this.prisma.contact.updateMany({
      where: { botId: bot.id, externalId: friendId },
      data: { name: alias },
    });
    // Cập nhật title của conversation tương ứng
    const conversation = await this.prisma.conversation.findFirst({
      where: { botId: bot.id, threadExternalId: friendId },
      select: { id: true },
    });
    if (conversation) {
      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { title: alias },
      });
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
    const contact = await this.prisma.contact.findFirst({
      where: { botId: bot.id, externalId: friendId },
    });
    if (!contact) throw new NotFoundException('Contact not found');
    if (channel === ChannelType.zalo) {
      await this.zca.removeFriendAlias(bot.externalId, friendId);
    }
    // Khôi phục tên về zaloName nếu có
    const restoreName = (contact as any).zaloName || contact.name;
    await this.prisma.contact.update({
      where: { id: contact.id },
      data: { name: restoreName },
    });
    // Cập nhật title của conversation tương ứng
    const conversation = await this.prisma.conversation.findFirst({
      where: { botId: bot.id, threadExternalId: friendId },
      select: { id: true },
    });
    if (conversation) {
      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { title: restoreName },
      });
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
      const contact = await this.prisma.contact.findFirst({
        where: {
          botId: bot.id,
          id: parseInt(targetUserId, 10),
        },
      });
      if (contact) {
        threadExternalId = contact.externalId;
      }
    }

    const conversation = await this.prisma.conversation.upsert({
      where: {
        botId_threadExternalId: {
          botId: bot.id,
          threadExternalId,
        },
      },
      create: {
        botId: bot.id,
        threadType: 'user',
        threadExternalId,
        title: displayName,
        avatar: avatar,
      },
      update: {
        title: displayName,
        avatar: avatar,
      },
    });

    await this.prisma.participant.upsert({
      where: {
        conversationId_externalId: {
          conversationId: conversation.id,
          externalId: threadExternalId,
        },
      },
      create: {
        conversationId: conversation.id,
        externalId: threadExternalId,
        displayName: displayName,
        avatar: avatar,
        isBot: false,
      },
      update: {
        displayName: displayName,
        avatar: avatar,
      },
    });

    return conversation;
  }
}
