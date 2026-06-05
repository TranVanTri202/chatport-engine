import { Injectable, Logger } from '@nestjs/common';
import { BotStatus } from '@prisma/client';
import { MessagingPublisher } from '@/messaging/messaging.publisher';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { ZaloNormalizer, ZaloRawMessage } from './zalo.normalizer';
import { ZaloInstanceRegistry } from './zalo-instance.registry';
import { ZaloZcaService } from './zalo-zca.service';

/**
 * Attach zca-js event listeners and forward `message` events into the
 * channel-agnostic inbound queue. Side-events (reaction, undo, group_event,
 * friend_event, closed, error) are logged for now and will get their own
 * queue (`messaging-side-events`) in a later milestone.
 *
 * Adapter-private.
 */
@Injectable()
export class ZaloListeners {
  private readonly logger = new Logger(ZaloListeners.name);

  constructor(
    private readonly normalizer: ZaloNormalizer,
    private readonly publisher: MessagingPublisher,
    private readonly instances: ZaloInstanceRegistry,
    private readonly prisma: PrismaService,
    private readonly zca: ZaloZcaService,
  ) {}

  attach(botExternalId: string, botId: number): void {
    this.zca.attachListeners(botExternalId, {
      onMessage: async (message) => {
        const raw = message as ZaloRawMessage;
        await this.dispatchMessage(botExternalId, raw);
      },
      onClosed: async (code) => {
        if (code === 3003) await this.handleClosed3003(botExternalId);
      },
      onFriendEvent: async (event) => {
        await this.handleFriendEvent(botId, botExternalId, event);
      },
    });

    this.logger.log(`Attached Zalo listeners for bot=${botId} uid=${botExternalId}`);
  }

  /** Called from `attach` once an inbound `message` event is normalized. */
  protected async dispatchMessage(
    botExternalId: string,
    raw: ZaloRawMessage,
  ): Promise<void> {
    const inbound = this.normalizer.normalizeMessage({ botExternalId, raw });
    await this.publisher.publishInbound(inbound);
  }

  /** Called from `attach` when zca-js emits `closed` with code 3003. */
  protected async handleClosed3003(botExternalId: string): Promise<void> {
    this.instances.delete(botExternalId);

    await this.prisma.bot.updateMany({
      where: {
        channel: 'zalo',
        externalId: botExternalId,
      },
      data: {
        status: BotStatus.expired,
      },
    });

    this.logger.warn(`Zalo cookie expired for uid=${botExternalId}`);
  }

  /** Handle real-time friend/contact sync events from Zalo */
  protected async handleFriendEvent(
    botId: number,
    botExternalId: string,
    event: any,
  ): Promise<void> {
    this.logger.log(`Received Zalo friend_event: type=${event.type} for botId=${botId}`);
    try {
      const type = event.type;
      if (type === 0) { // ADD
        const friendUid = event.data as string;
        this.logger.log(`Friend added: ${friendUid}`);
        const profile = await this.zca.getUserProfile(botExternalId, friendUid);
        await this.prisma.contact.upsert({
          where: {
            botId_externalId: { botId, externalId: friendUid },
          },
          create: {
            botId,
            externalId: friendUid,
            name: profile?.displayName || 'Zalo Friend',
            avatar: profile?.avatar || null,
            isFriend: true,
          },
          update: {
            name: profile?.displayName || undefined,
            avatar: profile?.avatar || undefined,
            isFriend: true,
          },
        });
      } else if (type === 1) { // REMOVE
        const friendUid = event.data as string;
        this.logger.log(`Friend removed: ${friendUid}`);
        await this.prisma.contact.updateMany({
          where: { botId, externalId: friendUid },
          data: { isFriend: false },
        });
      } else if (type === 2) { // REQUEST
        const reqData = event.data as { fromUid: string; message: string };
        const senderUid = reqData.fromUid;
        this.logger.log(`Friend request received from: ${senderUid}`);
        const profile = await this.zca.getUserProfile(botExternalId, senderUid);
        await this.prisma.friendRequest.upsert({
          where: {
            botId_externalId: { botId, externalId: senderUid },
          },
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
      } else if (type === 3 || type === 4) { // UNDO_REQUEST or REJECT_REQUEST
        const reqData = event.data as { fromUid: string };
        const senderUid = reqData.fromUid;
        this.logger.log(`Friend request cancelled/declined for: ${senderUid}`);
        await this.prisma.friendRequest.deleteMany({
          where: { botId, externalId: senderUid },
        });
      }
    } catch (error) {
      this.logger.error(`Error handling friend_event for botId=${botId}: ${(error as Error).message}`);
    }
  }
}
