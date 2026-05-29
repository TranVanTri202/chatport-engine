import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { ChannelType, ThreadType } from '@/shared/types';
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
import { ZaloNormalizer } from './zalo.normalizer';
import { ZaloListeners } from './zalo.listeners';
import { MessagingPublisher } from '@/messaging/messaging.publisher';

@Injectable()
export class ZaloAdapter implements IChannelAdapter, OnModuleInit {
  readonly channel = ChannelType.zalo;

  private readonly logger = new Logger(ZaloAdapter.name);

  constructor(
    private readonly registry: ChannelRegistry,
    private readonly instances: ZaloInstanceRegistry,
    private readonly sessions: ZaloSessionService,
    private readonly normalizer: ZaloNormalizer,
    private readonly listeners: ZaloListeners,
    private readonly publisher: MessagingPublisher,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async startLogin(input: StartLoginInput): Promise<StartLoginResult> {
    const sessionId = randomUUID();
    const { Zalo } = await import('zca-js');
    const zalo = new Zalo({ selfListen: false, checkUpdate: true, logging: true });
    const qrPath = join(process.cwd(), 'qr.png');

    void zalo.loginQR(
      { userAgent: 'AskBase_BE', qrPath },
      async (event) => {
        const type = event.type;
        if (type === 0) {
          this.logger.log(`Zalo QR generated for customer=${input.customerId}`);
          return;
        }
        if (type === 1) {
          this.logger.warn(`Zalo QR expired for customer=${input.customerId}`);
          return;
        }
        if (type === 2) {
          this.logger.log(`Zalo QR scanned by ${event.data.display_name}`);
          return;
        }
        if (type === 3) {
          this.logger.warn(`Zalo QR declined: ${event.data.code}`);
          return;
        }
        if (type === 4) {
          const payload: ZaloSessionPayload = {
            cookie: event.data.cookie,
            imei: event.data.imei,
            userAgent: event.data.userAgent,
          };
          await this.sessions.save(input.customerId, payload);
          const api = zalo;
          const context = typeof api.getContext === 'function' ? api.getContext() : null;
          const botExternalId = String(context?.uid ?? input.customerId);
          this.instances.set(botExternalId, api);
          this.listeners.attach(api, { id: input.customerId, externalId: botExternalId });
          this.logger.log(`Zalo login success for customer=${input.customerId}`);
        }
      },
    );

    return {
      sessionId,
      hint: { kind: 'qr', data: { sessionId, qrPath, qrBase64Url: '/channels/zalo/qr' } },
    };
  }

  async restore(botId: number): Promise<void> {
    const session = await this.sessions.load(botId);
    if (!session) return;

    const { Zalo } = await import('zca-js');
    const zalo = new Zalo({ selfListen: false, checkUpdate: false, logging: false });
    const api = await zalo.login({
      cookie: session.cookie,
      imei: session.imei,
      userAgent: session.userAgent,
    });

    const context = typeof api?.getContext === 'function' ? api.getContext() : null;
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
    if (!msg.text && !msg.attachments?.length) {
      throw new ChannelSendError('Empty outbound message');
    }

    const threadType = msg.threadType === ThreadType.group ? 1 : 0;

    try {
      if (msg.text) {
        await api.sendMessage?.({ msg: msg.text }, msg.threadId, threadType);
      }
      for (const attachment of msg.attachments ?? []) {
        await api.sendMessage?.(
          { msg: attachment.caption ?? '', attachments: [{ data: attachment.url }] },
          msg.threadId,
          threadType,
        );
      }
      return { messageExternalId: null, sentAt: Date.now() };
    } catch (error) {
      throw new ChannelSendError(
        `Failed to send Zalo message: ${(error as Error).message}`,
      );
    }
  }

  async status(botExternalId: string): Promise<ChannelStatus> {
    return this.instances.has(botExternalId) ? 'online' : 'offline';
  }
}
