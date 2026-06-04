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
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async startLogin(input: StartLoginInput): Promise<StartLoginResult> {
    const { Zalo } = await import('zca-js');
    const zalo = new Zalo({ selfListen: false, checkUpdate: true, logging: true });
    this.qrStorage.ensureExists();
    const qrPath = this.qrStorage.getQrPath();
    this.logger.log(`Zalo QR output path: ${qrPath}`);

    let loginPayload: ZaloSessionPayload | null = null;
    let botName = 'Zalo Bot';
    let botAvatar: string | null = null;

    try {
      const api = await zalo.loginQR(
        { qrPath },
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
      const apiAny = api as any;
      const context = typeof apiAny?.getContext === 'function' ? apiAny.getContext() : null;
      const botExternalId = String(context?.uid ?? input.customerId);

      try {
        if (typeof apiAny.fetchAccountInfo === 'function') {
          const infoBot = await apiAny.fetchAccountInfo();
          const profile = infoBot?.profile;
          if (profile) {
            botName = profile.zaloName || botName;
            botAvatar = profile.avatar || botAvatar;
          }
        }
      } catch (e) {
        this.logger.warn(`Failed to fetch account info from api: ${(e as Error).message}`);
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
      this.listeners.attach(api, { id: bot.id, externalId: botExternalId });
      this.logger.log(`Zalo login success and saved for customer=${input.customerId}, botId=${bot.id}`);

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

    const { Zalo } = await import('zca-js');
    const zalo = new Zalo({ selfListen: false, checkUpdate: false, logging: false });
    const api = await zalo.login({
      cookie: session.cookie as any,
      imei: session.imei,
      userAgent: session.userAgent,
    });

    const apiAny = api as any;
    const context = typeof apiAny?.getContext === 'function' ? apiAny.getContext() : null;
    const botExternalId = String(context?.uid ?? botId);

    this.instances.set(botExternalId, api);
    this.listeners.attach(api, { id: botId, externalId: botExternalId });
  }

  async logout(botId: number): Promise<void> {
    this.instances.delete(String(botId));
    await this.sessions.clear(botId);
    this.logger.log(`Zalo bot logged out: ${botId}`);
  }

  async send(botExternalId: string, msg: OutboundMessage): Promise<SendResult> {
    const api = this.instances.get(botExternalId) as {
      sendMessage?: (payload: Record<string, unknown>, threadId: string, type: number) => Promise<unknown>;
    } | undefined;

    if (!api) throw new ChannelOfflineError(botExternalId);

    const threadType = msg.threadType === ThreadType.group ? 1 : 0;

    try {
      await this.sendByType(api, msg, threadType);
      return { messageExternalId: null, sentAt: Date.now() };
    } catch (error) {
      if (error instanceof ChannelSendError) throw error;
      throw new ChannelSendError(`Failed to send Zalo message: ${(error as Error).message}`);
    }
  }

  private async sendByType(
    api: { sendMessage?: (payload: Record<string, unknown>, threadId: string, type: number) => Promise<unknown> },
    msg: OutboundMessage,
    threadType: number,
  ): Promise<void> {
    switch (msg.type) {
      case 'chat':
        return this.sendText(api, msg.threadId, threadType, msg.text);
      case 'image':
        return this.sendImage(api, msg.threadId, threadType, msg.text, msg.attachments);
      default:
        throw new ChannelSendError(`Unsupported outbound message type: ${msg.type}`);
    }
  }

  private async sendText(
    api: { sendMessage?: (payload: Record<string, unknown>, threadId: string, type: number) => Promise<unknown> },
    threadId: string,
    threadType: number,
    text?: string,
  ): Promise<void> {
    if (!text?.trim()) {
      throw new ChannelSendError('Text is required for chat messages');
    }
    await api.sendMessage?.({ msg: text }, threadId, threadType);
  }

  private async sendImage(
    api: { sendMessage?: (payload: Record<string, unknown>, threadId: string, type: number) => Promise<unknown> },
    threadId: string,
    threadType: number,
    text: string | undefined,
    attachments?: Array<{ url: string; caption?: string }>,
  ): Promise<void> {
    if (!attachments?.length) {
      throw new ChannelSendError('Image attachment is required for image messages');
    }
    const [first] = attachments;
    await api.sendMessage?.(
      {
        msg: first.caption ?? text ?? '',
        attachments: [{ data: first.url }],
      },
      threadId,
      threadType,
    );
  }

  async status(botExternalId: string): Promise<ChannelStatus> {
    return this.instances.has(botExternalId) ? 'online' : 'offline';
  }
}
