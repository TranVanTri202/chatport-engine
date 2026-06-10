import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { DOMAIN_EVENTS } from '@/shared/events/domain-events';
import { MessagingPublisher } from '@/messaging/messaging.publisher';

/**
 * Handles pin/unpin events in 1-to-1 Zalo chats.
 * These arrive as friend_event type 10 (unpin) or type 11 (pin/unpin).
 *
 * Note: the original code had a duplicate unreachable type=10 block after
 * the type=10/11 combined block — removed here.
 */
@Injectable()
export class ZaloUserchatListener {
  private readonly logger = new Logger(ZaloUserchatListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly publisher: MessagingPublisher,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /** Handles friend_event type 10 (unpin) or 11 (pin/unpin) */
  async handle(
    botId: number,
    botExternalId: string,
    event: any,
  ): Promise<void> {
    const topic = event.data?.topic;
    const threadId = event.threadId || event.data?.conversationId;
    if (!topic || !threadId) return;

    const bot = await this.prisma.bot.findUnique({
      where: { id: botId },
    });
    if (!bot) return;

    const conversation = await this.prisma.conversation.findFirst({
      where: {
        botId,
        threadExternalId: String(threadId),
      },
    });
    if (!conversation) return;

    const type = event.type;
    const isUnpin = type === 10 || topic.action === 1;

    if (isUnpin) {
      await this.handleUnpin(botExternalId, conversation.id, String(threadId), topic, event, bot.customerId);
    } else {
      await this.handlePin(botExternalId, conversation.id, String(threadId), topic, event, bot.customerId);
    }

    this.eventEmitter.emit(DOMAIN_EVENTS.ConversationUpdated, {
      customerId: bot.customerId,
      conversationId: conversation.id,
    });
  }

  private async handlePin(
    botExternalId: string,
    conversationId: number,
    threadId: string,
    topic: any,
    event: any,
    customerId: number,
  ): Promise<void> {
    const metadata = await this.getConversationMetadata(conversationId);
    let pinnedMessages = metadata.pinnedMessages || [];

    let params = topic.params;
    if (typeof params === 'string') {
      try { params = JSON.parse(params); } catch { params = {}; }
    }

    const pinEntry = {
      id: String(topic.topicId || topic.id || ''),
      creatorId: String(topic.creatorId || ''),
      createTime: Number(topic.createTime || Date.now()),
      params: {
        title: params?.title || '',
        senderName: params?.senderName || 'Thành viên',
        client_msg_id: params?.client_msg_id || undefined,
      },
    };

    // Remove existing pin with same id, then push new one
    pinnedMessages = pinnedMessages.filter((t: any) => t.id !== pinEntry.id);
    pinnedMessages.push(pinEntry);

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        metadata: { ...metadata, pinnedMessages },
      },
    });

    // Emit notification message
    const isBotCreator = String(topic.creatorId) === botExternalId;
    const creatorName = params?.senderName || 'Thành viên';
    const titleStr = params?.title || '';
    const notificationText = isBotCreator
      ? `Bạn đã ghim tin nhắn ${titleStr}`
      : `${creatorName} đã ghim tin nhắn ${titleStr}`;

    await this.publisher.publishInbound({
      channel: 'zalo' as any,
      botExternalId,
      threadId,
      threadType: 'user' as any,
      senderExternalId: String(topic.creatorId || botExternalId),
      senderName: creatorName,
      messageExternalId: `pin_notif_${pinEntry.id}_${topic.createTime || Date.now()}`,
      timestamp: Number(topic.createTime || Date.now()),
      type: 'pin',
      text: notificationText,
      attachments: [],
      isSelf: isBotCreator,
      raw: {
        isSystemPin: true,
        topicId: pinEntry.id,
        title: titleStr,
        creatorId: topic.creatorId,
        creatorName,
      },
    });
  }

  private async handleUnpin(
    botExternalId: string,
    conversationId: number,
    threadId: string,
    topic: any,
    event: any,
    customerId: number,
  ): Promise<void> {
    const metadata = await this.getConversationMetadata(conversationId);
    let pinnedMessages = metadata.pinnedMessages || [];

    const targetId = String(topic.topicId || topic.id || '');
    const existingPin = pinnedMessages.find((t: any) => t.id === targetId);
    const title = existingPin?.params?.title || '';

    pinnedMessages = pinnedMessages.filter((t: any) => t.id !== targetId);

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        metadata: { ...metadata, pinnedMessages },
      },
    });

    // Emit notification message
    const isBotActor = event.data?.actorId
      ? String(event.data.actorId) === botExternalId
      : false;
    const senderName = existingPin?.params?.senderName || 'Thành viên';
    const actorName = isBotActor ? 'Bạn' : senderName;
    const notificationText = isBotActor
      ? title
        ? `Bạn đã bỏ ghim tin nhắn ${title}`
        : `Bạn đã bỏ ghim tin nhắn`
      : title
        ? `${actorName} đã bỏ ghim tin nhắn ${title}`
        : `${actorName} đã bỏ ghim tin nhắn`;

    await this.publisher.publishInbound({
      channel: 'zalo' as any,
      botExternalId,
      threadId,
      threadType: 'user' as any,
      senderExternalId: String(event.data?.actorId || botExternalId),
      senderName: actorName,
      messageExternalId: `unpin_notif_${targetId}_${Date.now()}`,
      timestamp: Date.now(),
      type: 'pin',
      text: notificationText,
      attachments: [],
      isSelf: isBotActor,
      raw: {
        isSystemPin: true,
        isUnpin: true,
        topicId: targetId,
        creatorId: event.data?.actorId,
        creatorName: actorName,
      },
    });
  }

  private async getConversationMetadata(
    conversationId: number,
  ): Promise<Record<string, any>> {
    const convo = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { metadata: true },
    });
    return (convo?.metadata as Record<string, any>) || {};
  }
}
