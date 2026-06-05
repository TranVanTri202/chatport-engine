import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ChannelType, ThreadType } from '@/shared/types';
import { ZaloQrStorageService } from './zalo-qr-storage.service';
import {
  ChannelOfflineError,
  ChannelSendError,
} from '@/shared/errors/channel.errors';
import {
  IChannelAdapter,
  OutboundMessage,
  SendResult,
  StartLoginInput,
  StartLoginResult,
  ChannelStatus,
} from '../channel-adapter.interface';
import { ChannelRegistry } from '../channel-registry.service';
import { ZaloInstanceRegistry } from './zalo-instance.registry';
import { ZaloSessionService, ZaloSessionPayload } from './zalo-session.service';
import { ZaloListeners } from './zalo.listeners';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { ZaloZcaService } from './zalo-zca.service';

@Injectable()
export class ZaloAdapter implements IChannelAdapter, OnModuleInit {
  readonly channel = ChannelType.zalo;

  private readonly logger = new Logger(ZaloAdapter.name);

  constructor(
    private readonly registry: ChannelRegistry,
    private readonly instances: ZaloInstanceRegistry,
    private readonly sessions: ZaloSessionService,
    private readonly listeners: ZaloListeners,
    private readonly qrStorage: ZaloQrStorageService,
    private readonly prisma: PrismaService,
    private readonly zca: ZaloZcaService,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async startLogin(input: StartLoginInput): Promise<StartLoginResult> {
    this.qrStorage.ensureExists();
    const qrPath = this.qrStorage.getQrPath();
    this.logger.log(`Zalo QR output path: ${qrPath}`);

    let loginPayload: ZaloSessionPayload | null = null;
    let botName = 'Zalo Bot';
    let botAvatar: string | null = null;

    try {
      const api = await this.zca.loginQR(
        qrPath,
        async (event) => {
          const type = event.type;
          if (type === 0) {
            this.logger.log(`Zalo QR generated for customer=${input.customerId}`);
            await event.actions.saveToFile(qrPath);
            this.logger.log(`Zalo QR saved to file for customer=${input.customerId}: ${qrPath}`);
            return;
          }
          if (type === 1) {
            this.logger.warn(`Zalo QR expired for customer=${input.customerId}`);
            return;
          }
          if (type === 2) {
            botName = event.data?.display_name || botName;
            botAvatar = event.data?.avatar || botAvatar;
            this.logger.log(`Zalo QR scanned by ${botName}`);
            return;
          }
          if (type === 3) {
            this.logger.warn(`Zalo QR declined: ${event.data.code}`);
            return;
          }
          if (type === 4) {
            loginPayload = {
              cookie: event.data.cookie,
              imei: event.data.imei,
              userAgent: event.data.userAgent,
            };
          }
        },
      );

      if (!loginPayload) {
        throw new Error('Zalo login completed but session payload was not returned');
      }

      this.logger.log(`Zalo login API resolved for customer=${input.customerId}`);
      const botExternalId = this.zca.getUid(api) ?? String(input.customerId);

      try {
        const profile = await this.zca.getBotProfileByApi(api);
        if (profile) {
          botName = profile.name;
          botAvatar = profile.avatar;
        }
      } catch (e) {
        this.logger.warn(`Failed to fetch account info: ${(e as Error).message}`);
      }

      // 1. Create or update Bot in database
      const bot = await this.prisma.bot.upsert({
        where: {
          channel_externalId: {
            channel: ChannelType.zalo,
            externalId: botExternalId,
          },
        },
        create: {
          customerId: input.customerId,
          channel: ChannelType.zalo,
          externalId: botExternalId,
          name: botName,
          avatar: botAvatar,
          status: 'active',
        },
        update: {
          customerId: input.customerId,
          name: botName,
          avatar: botAvatar,
          status: 'active',
        },
      });

      // 2. Save session using the Bot's ID
      await this.sessions.save(bot.id, loginPayload);

      // 3. Keep in memory and attach listeners
      this.instances.set(botExternalId, api);
      this.listeners.attach(botExternalId, bot.id);
      this.logger.log(`Zalo login success and saved for customer=${input.customerId}, botId=${bot.id}`);

      // Sync friends list in the background
      void this.syncFriends(bot.id, botExternalId);
      void this.syncGroups(bot.id, botExternalId);

      return {
        sessionId: String(bot.id),
        hint: { kind: 'none', data: bot }
      };
    } catch (err) {
      this.logger.error(`Zalo startLogin failed for customer=${input.customerId}: ${(err as Error).message}`);
      throw err;
    }
  }

  async restore(botId: number): Promise<void> {
    const session = await this.sessions.load(botId);
    if (!session) return;

    const api = await this.zca.login({
      cookie: session.cookie as any,
      imei: session.imei,
      userAgent: session.userAgent,
    });

    const botExternalId = this.zca.getUid(api) ?? String(botId);

    this.instances.set(botExternalId, api);
    this.listeners.attach(botExternalId, botId);

    // Sync friends list in the background
    void this.syncFriends(botId, botExternalId);
    void this.syncGroups(botId, botExternalId);
  }

  async syncFriends(botId: number, botExternalId: string): Promise<void> {
    try {
      this.logger.log(`Syncing friends list for botId=${botId} (${botExternalId})`);
      const friends = await this.zca.getAllFriends(botExternalId);
      this.logger.log(`Found ${friends.length} friends for botId=${botId}`);
      for (const friend of friends) {
        await this.prisma.contact.upsert({
          where: {
            botId_externalId: {
              botId,
              externalId: friend.userId,
            },
          },
          create: {
            botId,
            externalId: friend.userId,
            name: friend.displayName || friend.zaloName || friend.username || 'Zalo Friend',
            avatar: friend.avatar || null,
            isFriend: true,
          },
          update: {
            name: friend.displayName || friend.zaloName || friend.username || 'Zalo Friend',
            avatar: friend.avatar || null,
            isFriend: true,
          },
        });
      }
      this.logger.log(`Successfully synced friends list for botId=${botId}`);

      // Sync incoming friend requests
      this.logger.log(`Syncing incoming friend requests for botId=${botId}`);
      const requests = await this.zca.getFriendRequests(botExternalId);
      this.logger.log(`Found ${requests.length} incoming requests for botId=${botId}`);

      const existingDbRequests = await this.prisma.friendRequest.findMany({
        where: { botId },
      });
      const activeExternalIds = new Set(requests.map((r) => r.userId));
      const toDelete = existingDbRequests.filter((r) => !activeExternalIds.has(r.externalId));
      if (toDelete.length > 0) {
        await this.prisma.friendRequest.deleteMany({
          where: {
            id: { in: toDelete.map((r) => r.id) },
          },
        });
      }

      for (const req of requests) {
        await this.prisma.friendRequest.upsert({
          where: {
            botId_externalId: {
              botId,
              externalId: req.userId,
            },
          },
          create: {
            botId,
            externalId: req.userId,
            name: req.displayName,
            avatar: req.avatar,
            source: req.message || 'Zalo Request',
          },
          update: {
            name: req.displayName,
            avatar: req.avatar,
            source: req.message || 'Zalo Request',
          },
        });
      }
      this.logger.log(`Successfully synced friend requests for botId=${botId}`);
    } catch (error) {
      this.logger.error(`Failed to sync friends/requests for botId=${botId}: ${(error as Error).message}`);
    }
  }

  async syncGroups(botId: number, botExternalId: string): Promise<void> {
    try {
      this.logger.log(`Syncing groups list for botId=${botId} (${botExternalId})`);
      const groupIds = await this.zca.getAllGroups(botExternalId);
      this.logger.log(`Found ${groupIds.length} groups for botId=${botId}`);
      for (const groupId of groupIds) {
        const groupInfo = await this.zca.getGroupInfo(botExternalId, groupId);
        if (groupInfo) {
          // Find or create conversation
          const conversation = await this.prisma.conversation.upsert({
            where: {
              botId_threadExternalId: {
                botId,
                threadExternalId: groupId,
              },
            },
            create: {
              botId,
              threadType: 'group',
              threadExternalId: groupId,
              title: groupInfo.name || 'Zalo Group',
              avatar: groupInfo.avt || null,
              lastMessageAt: new Date(0),
              metadata: {
                memberCount: groupInfo.totalMember || 0,
              },
            },
            update: {
              title: groupInfo.name || undefined,
              avatar: groupInfo.avt || undefined,
            },
          });

          // Shallow merge metadata
          const existingMeta = (conversation.metadata as Record<string, any>) || {};
          await this.prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              metadata: {
                ...existingMeta,
                memberCount: groupInfo.totalMember || 0,
              },
            },
          });
        }
      }
      this.logger.log(`Successfully synced groups list for botId=${botId}`);
    } catch (error) {
      this.logger.error(`Failed to sync groups for botId=${botId}: ${(error as Error).message}`);
    }
  }

  async logout(botId: number): Promise<void> {
    this.instances.delete(String(botId));
    await this.sessions.clear(botId);
    this.logger.log(`Zalo bot logged out: ${botId}`);
  }

  async send(botExternalId: string, msg: OutboundMessage): Promise<SendResult> {
    const threadType = msg.threadType === ThreadType.group ? 1 : 0;

    try {
      await this.zca.sendMessage(botExternalId, msg.threadId, threadType, msg);
      return { messageExternalId: null, sentAt: Date.now() };
    } catch (error) {
      if (error instanceof ChannelSendError) throw error;
      throw new ChannelSendError(`Failed to send Zalo message: ${(error as Error).message}`);
    }
  }

  async status(botExternalId: string): Promise<ChannelStatus> {
    return this.instances.has(botExternalId) ? 'online' : 'offline';
  }
}
