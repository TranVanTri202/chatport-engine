import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { BotService } from '@/bot/bot.service';
import { ChannelType } from '@/shared/types';
import { Contact, FriendRequest } from '@prisma/client';
import { ZaloZcaService } from '@/channels/zalo/zalo-zca.service';

@Injectable()
export class ContactsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bots: BotService,
    private readonly zca: ZaloZcaService,
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

  async getOrCreateConversation(
    channel: ChannelType,
    externalId: string,
    targetUserId: string,
    displayName: string,
    avatar: string | null,
  ) {
    const bot = await this.bots.getByExternal(channel, externalId);

    const conversation = await this.prisma.conversation.upsert({
      where: {
        botId_threadExternalId: {
          botId: bot.id,
          threadExternalId: targetUserId,
        },
      },
      create: {
        botId: bot.id,
        threadType: 'user',
        threadExternalId: targetUserId,
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
          externalId: targetUserId,
        },
      },
      create: {
        conversationId: conversation.id,
        externalId: targetUserId,
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
