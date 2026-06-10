import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ThreadType } from '@prisma/client';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { DOMAIN_EVENTS } from '@/shared/events/domain-events';
import { MessagingPublisher } from '@/messaging/messaging.publisher';
import { ZaloZcaService } from '../zalo-zca.service';

/**
 * Handles Zalo group_event: join, leave, remove_member, block_member,
 * new_pin_topic, update_pin_topic, unpin_topic, reorder_pin_topic,
 * and catch-all group info updates.
 */
@Injectable()
export class ZaloGroupListener {
  private readonly logger = new Logger(ZaloGroupListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly zca: ZaloZcaService,
    private readonly publisher: MessagingPublisher,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async handle(botId: number, botExternalId: string, event: any): Promise<void> {
    this.logger.log(
      `Received Zalo group_event: type=${event?.type} threadId=${event?.threadId}`,
    );
    try {
      const threadId = event?.threadId;
      if (!threadId) return;

      const type = event?.type;
      const updateMembers = event?.data?.updateMembers || [];

      // Resolve bot
      const bot = await this.prisma.bot.findUnique({
        where: { id: botId },
        select: { customerId: true },
      });
      if (!bot) return;

      // Find or create conversation
      let conversation = await this.prisma.conversation.findUnique({
        where: { botId_threadExternalId: { botId, threadExternalId: String(threadId) } },
      });

      if (!conversation) {
        const groupInfo = await this.zca.getGroupInfo(botExternalId, String(threadId));
        conversation = await this.prisma.conversation.create({
          data: {
            botId,
            threadType: ThreadType.group,
            threadExternalId: String(threadId),
            title: groupInfo?.name || 'Zalo Group',
            avatar: groupInfo?.avt || null,
            unread: 0,
            metadata: groupInfo ? { memberCount: groupInfo.totalMember } : {},
          },
        });
      }

      switch (type) {
        case 'join':
          await this.handleJoin(botExternalId, conversation.id, threadId, updateMembers);
          break;
        case 'leave':
        case 'remove_member':
        case 'block_member':
          await this.handleMemberLeave(botExternalId, conversation.id, threadId, updateMembers, type);
          break;
        case 'new_pin_topic':
        case 'update_pin_topic':
          await this.handleGroupPin(botExternalId, conversation.id, threadId, event.data?.topic, bot.customerId);
          break;
        case 'unpin_topic':
          await this.handleGroupUnpin(botExternalId, conversation.id, threadId, event.data?.topic, bot.customerId);
          break;
        case 'reorder_pin_topic':
          await this.handlePinReorder(conversation.id, event.data?.topics || [], bot.customerId);
          break;
        default:
          await this.syncGroupInfo(botExternalId, conversation.id, threadId);
      }

      // Emit conversation updated for all group events
      this.eventEmitter.emit(DOMAIN_EVENTS.ConversationUpdated, {
        customerId: bot.customerId,
        conversationId: conversation.id,
      });
    } catch (error) {
      this.logger.error(
        `Error handling group_event for botId=${botId}: ${(error as Error).message}`,
      );
    }
  }

  /** Members joined the group */
  private async handleJoin(
    botExternalId: string,
    conversationId: number,
    threadId: string,
    members: any[],
  ): Promise<void> {
    for (const member of members) {
      await this.prisma.participant.upsert({
        where: {
          conversationId_externalId: {
            conversationId,
            externalId: String(member.id),
          },
        },
        create: {
          conversationId,
          externalId: String(member.id),
          displayName: member.dName || 'Zalo Member',
          avatar: member.avatar || null,
          isBot: String(member.id) === botExternalId,
        },
        update: {
          displayName: member.dName || undefined,
          avatar: member.avatar || undefined,
        },
      });
    }
  }

  /** Members left or were removed from the group */
  private async handleMemberLeave(
    botExternalId: string,
    conversationId: number,
    threadId: string,
    members: any[],
    eventType: string,
  ): Promise<void> {
    const memberIds = members.map((m: any) => String(m.id));
    if (memberIds.length > 0) {
      await this.prisma.participant.deleteMany({
        where: { conversationId, externalId: { in: memberIds } },
      });
    }

    const isBotRemoved = memberIds.includes(botExternalId);
    if (isBotRemoved) {
      this.logger.warn(
        `Bot ${botExternalId} was removed from/left group ${threadId} (event=${eventType})`,
      );
      const metadata = await this.getMetadata(conversationId);
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: {
          metadata: { ...metadata, isBotParticipant: false, memberCount: 0 },
        },
      });
    } else {
      await this.syncGroupInfo(botExternalId, conversationId, threadId);
    }
  }

  /** Pin a message in group */
  private async handleGroupPin(
    botExternalId: string,
    conversationId: number,
    threadId: string,
    topic: any,
    customerId: number,
  ): Promise<void> {
    if (!topic) return;

    let params = topic.params;
    if (typeof params === 'string') {
      try { params = JSON.parse(params); } catch { params = {}; }
    }

    const metadata = await this.getMetadata(conversationId);
    let pinnedMessages = metadata.pinnedMessages || [];

    const pinEntry = {
      id: String(topic.id),
      creatorId: String(topic.creatorId || ''),
      createTime: Number(topic.createTime || Date.now()),
      params: {
        title: params?.title || '',
        senderName: params?.senderName || 'Thành viên',
        client_msg_id: params?.client_msg_id || undefined,
      },
    };

    pinnedMessages = pinnedMessages.filter((t: any) => t.id !== pinEntry.id);
    pinnedMessages.push(pinEntry);

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { metadata: { ...metadata, pinnedMessages } },
    });

    // Notification message
    const creatorName = params?.senderName || 'Thành viên';
    const title = params?.title || '';
    const isBotCreator = String(topic.creatorId) === botExternalId;
    const notificationText = isBotCreator
      ? `Bạn đã ghim tin nhắn ${title}`
      : `${creatorName} đã ghim tin nhắn ${title}`;

    await this.publisher.publishInbound({
      channel: 'zalo' as any,
      botExternalId,
      threadId,
      threadType: 'group' as any,
      senderExternalId: String(topic.creatorId || botExternalId),
      senderName: creatorName,
      messageExternalId: `pin_notif_${topic.id}_${topic.createTime || Date.now()}`,
      timestamp: Number(topic.createTime || Date.now()),
      type: 'pin',
      text: notificationText,
      attachments: [],
      isSelf: isBotCreator,
      raw: {
        isSystemPin: true,
        topicId: topic.id,
        title,
        creatorId: topic.creatorId,
        creatorName,
      },
    });
  }

  /** Unpin a message in group */
  private async handleGroupUnpin(
    botExternalId: string,
    conversationId: number,
    threadId: string,
    topic: any,
    customerId: number,
  ): Promise<void> {
    if (!topic) return;

    const metadata = await this.getMetadata(conversationId);
    let pinnedMessages = metadata.pinnedMessages || [];

    const targetId = String(topic.id);
    const existingPin = pinnedMessages.find((t: any) => t.id === targetId);
    const title = existingPin?.params?.title || '';

    pinnedMessages = pinnedMessages.filter((t: any) => t.id !== targetId);

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { metadata: { ...metadata, pinnedMessages } },
    });

    // Notification message
    let params = topic.params;
    if (typeof params === 'string') {
      try { params = JSON.parse(params); } catch { params = {}; }
    }
    const creatorName =
      params?.senderName || existingPin?.params?.senderName || 'Thành viên';
    const isBotCreator = String(topic.creatorId) === botExternalId;
    const notificationText = isBotCreator
      ? title
        ? `Bạn đã bỏ ghim tin nhắn ${title}`
        : `Bạn đã bỏ ghim tin nhắn`
      : title
        ? `${creatorName} đã bỏ ghim tin nhắn ${title}`
        : `${creatorName} đã bỏ ghim tin nhắn`;

    await this.publisher.publishInbound({
      channel: 'zalo' as any,
      botExternalId,
      threadId,
      threadType: 'group' as any,
      senderExternalId: String(topic.creatorId || botExternalId),
      senderName: creatorName,
      messageExternalId: `unpin_notif_${topic.id}_${Date.now()}`,
      timestamp: Date.now(),
      type: 'pin',
      text: notificationText,
      attachments: [],
      isSelf: isBotCreator,
      raw: {
        isSystemPin: true,
        isUnpin: true,
        topicId: topic.id,
        creatorId: topic.creatorId,
        creatorName,
      },
    });
  }

  /** Pins were reordered */
  private async handlePinReorder(
    conversationId: number,
    topicsOrder: any[],
    customerId: number,
  ): Promise<void> {
    const metadata = await this.getMetadata(conversationId);
    const pinnedMessages = metadata.pinnedMessages || [];

    const ordered: any[] = [];
    for (const orderItem of topicsOrder) {
      const found = pinnedMessages.find(
        (t: any) => t.id === String(orderItem.topicId),
      );
      if (found) ordered.push(found);
    }
    for (const t of pinnedMessages) {
      if (!ordered.find((o: any) => o.id === t.id)) {
        ordered.push(t);
      }
    }

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { metadata: { ...metadata, pinnedMessages: ordered } },
    });
  }

  /** Fetch group info from Zalo and sync title/avatar/memberCount */
  private async syncGroupInfo(
    botExternalId: string,
    conversationId: number,
    threadId: string,
  ): Promise<void> {
    const groupInfo = await this.zca.getGroupInfo(botExternalId, String(threadId));
    if (!groupInfo) return;

    const metadata = await this.getMetadata(conversationId);
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        title: groupInfo.name || undefined,
        avatar: groupInfo.avt || undefined,
        metadata: { ...metadata, memberCount: groupInfo.totalMember },
      },
    });
  }

  private async getMetadata(
    conversationId: number,
  ): Promise<Record<string, any>> {
    const convo = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { metadata: true },
    });
    return (convo?.metadata as Record<string, any>) || {};
  }
}
