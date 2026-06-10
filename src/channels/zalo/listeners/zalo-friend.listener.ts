import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { DOMAIN_EVENTS } from '@/shared/events/domain-events';
import { MessagingPublisher } from '@/messaging/messaging.publisher';
import { ZaloZcaService } from '../zalo-zca.service';

/**
 * Handles Zalo friend_event: add (0), remove (1), request (2),
 * undo_request (3), reject_request (4), block (6), unblock (7).
 *
 * Pin/unpin events (type 10, 11) are handled by ZaloUserchatListener.
 */
@Injectable()
export class ZaloFriendListener {
  private readonly logger = new Logger(ZaloFriendListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly zca: ZaloZcaService,
    private readonly publisher: MessagingPublisher,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async handle(botId: number, botExternalId: string, event: any): Promise<void> {
    this.logger.log(
      `Received Zalo friend_event: type=${event.type} for botId=${botId}`,
    );
    try {
      const bot = await this.prisma.bot.findUnique({
        where: { id: botId },
      });
      if (!bot) return;

      const { type } = event;

      switch (type) {
        case 0: // ADD
          await this.handleFriendAdd(botId, botExternalId, event.data as string);
          break;
        case 1: // REMOVE
          await this.handleFriendRemove(botId, botExternalId, event.data as string);
          break;
        case 2: // REQUEST
          await this.handleFriendRequest(botId, botExternalId, event.data);
          break;
        case 3: // UNDO_REQUEST
        case 4: // REJECT_REQUEST
          await this.handleRequestCancel(botId, botExternalId, event.data);
          break;
        case 6: // BLOCK
          await this.handleFriendBlock(botId, botExternalId, event.data as string);
          break;
        case 7: // UNBLOCK
          await this.handleFriendUnblock(botId, botExternalId, event.data as string);
          break;
        default:
          // type 10/11 handled by userchat listener; ignore unknown types
          break;
      }

      if ([0, 1, 2, 3, 4, 6, 7].includes(type)) {
        this.eventEmitter.emit(DOMAIN_EVENTS.ContactsUpdated, {
          customerId: bot.customerId,
        });
      }
    } catch (error) {
      this.logger.error(
        `Error handling friend_event for botId=${botId}: ${(error as Error).message}`,
      );
    }
  }

  /** Friend added */
  private async handleFriendAdd(
    botId: number,
    botExternalId: string,
    friendUid: string,
  ): Promise<void> {
    this.logger.log(`Friend added: ${friendUid}`);
    const profile = await this.zca.getUserProfile(botExternalId, friendUid);
    await this.prisma.contact.upsert({
      where: { botId_externalId: { botId, externalId: friendUid } },
      create: {
        botId,
        externalId: friendUid,
        name: profile?.displayName || 'Zalo Friend',
        avatar: profile?.avatar || null,
        isFriend: true,
      },
      update: {
        avatar: profile?.avatar || undefined,
        isFriend: true,
      },
    });

    const conversation = await this.prisma.conversation.findFirst({
      where: { botId, threadExternalId: friendUid },
    });
    if (conversation) {
      const profileName = profile?.displayName || 'Zalo Friend';
      await this.publisher.publishInbound({
        channel: 'zalo' as any,
        botExternalId,
        threadId: friendUid,
        threadType: 'user' as any,
        senderExternalId: friendUid,
        senderName: profileName,
        messageExternalId: `friend_add_${friendUid}_${Date.now()}`,
        timestamp: Date.now(),
        type: 'unknown' as any,
        text: `Bạn và ${profileName} đã trở thành bạn bè.`,
        attachments: [],
        isSelf: false,
        raw: { isFriendEvent: true, eventType: 'add' },
      });
    }
  }

  /** Friend removed */
  private async handleFriendRemove(
    botId: number,
    botExternalId: string,
    friendUid: string,
  ): Promise<void> {
    this.logger.log(`Friend removed: ${friendUid}`);
    const contact = await this.prisma.contact.findFirst({
      where: { botId, externalId: friendUid },
    });
    const friendName = contact?.name || 'Zalo Friend';

    await this.prisma.contact.updateMany({
      where: { botId, externalId: friendUid },
      data: { isFriend: false },
    });

    const conversation = await this.prisma.conversation.findFirst({
      where: { botId, threadExternalId: friendUid },
    });
    if (conversation) {
      await this.publisher.publishInbound({
        channel: 'zalo' as any,
        botExternalId,
        threadId: friendUid,
        threadType: 'user' as any,
        senderExternalId: friendUid,
        senderName: friendName,
        messageExternalId: `friend_remove_${friendUid}_${Date.now()}`,
        timestamp: Date.now(),
        type: 'unknown' as any,
        text: `Bạn và ${friendName} đã hủy kết bạn.`,
        attachments: [],
        isSelf: false,
        raw: { isFriendEvent: true, eventType: 'remove' },
      });
    }
  }

  /** Friend request received */
  private async handleFriendRequest(
    botId: number,
    botExternalId: string,
    reqData: { fromUid: string; message: string },
  ): Promise<void> {
    const senderUid = reqData.fromUid;
    this.logger.log(`Friend request received from: ${senderUid}`);
    const profile = await this.zca.getUserProfile(botExternalId, senderUid);
    await this.prisma.friendRequest.upsert({
      where: { botId_externalId: { botId, externalId: senderUid } },
      create: {
        botId,
        externalId: senderUid,
        name: profile?.displayName || 'Unknown User',
        avatar: profile?.avatar || null,
        source: 'Zalo Request',
      },
      update: {
        name: profile?.displayName || undefined,
        avatar: profile?.avatar || undefined,
      },
    });
  }

  /** Request cancelled or rejected */
  private async handleRequestCancel(
    botId: number,
    _botExternalId: string,
    reqData: { fromUid: string },
  ): Promise<void> {
    const senderUid = reqData.fromUid;
    this.logger.log(`Friend request cancelled/declined for: ${senderUid}`);
    await this.prisma.friendRequest.deleteMany({
      where: { botId, externalId: senderUid },
    });
  }

  /** Friend blocked */
  private async handleFriendBlock(
    botId: number,
    botExternalId: string,
    friendUid: string,
  ): Promise<void> {
    this.logger.log(`Friend blocked: ${friendUid}`);
    const contact = await this.prisma.contact.findFirst({
      where: { botId, externalId: friendUid },
    });
    const friendName = contact?.name || 'Zalo Friend';

    const conversation = await this.prisma.conversation.findFirst({
      where: { botId, threadExternalId: friendUid },
    });
    if (conversation) {
      await this.publisher.publishInbound({
        channel: 'zalo' as any,
        botExternalId,
        threadId: friendUid,
        threadType: 'user' as any,
        senderExternalId: friendUid,
        senderName: friendName,
        messageExternalId: `friend_block_${friendUid}_${Date.now()}`,
        timestamp: Date.now(),
        type: 'unknown' as any,
        text: `Bạn đã chặn ${friendName}.`,
        attachments: [],
        isSelf: false,
        raw: { isFriendEvent: true, eventType: 'block' },
      });
    }
  }

  /** Friend unblocked */
  private async handleFriendUnblock(
    botId: number,
    botExternalId: string,
    friendUid: string,
  ): Promise<void> {
    this.logger.log(`Friend unblocked: ${friendUid}`);
    const contact = await this.prisma.contact.findFirst({
      where: { botId, externalId: friendUid },
    });
    const friendName = contact?.name || 'Zalo Friend';

    const conversation = await this.prisma.conversation.findFirst({
      where: { botId, threadExternalId: friendUid },
    });
    if (conversation) {
      await this.publisher.publishInbound({
        channel: 'zalo' as any,
        botExternalId,
        threadId: friendUid,
        threadType: 'user' as any,
        senderExternalId: friendUid,
        senderName: friendName,
        messageExternalId: `friend_unblock_${friendUid}_${Date.now()}`,
        timestamp: Date.now(),
        type: 'unknown' as any,
        text: `Bạn đã bỏ chặn ${friendName}.`,
        attachments: [],
        isSelf: false,
        raw: { isFriendEvent: true, eventType: 'unblock' },
      });
    }
  }
}
