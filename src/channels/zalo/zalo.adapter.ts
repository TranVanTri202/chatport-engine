import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
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
    const { Zalo, LoginQRCallbackEventType } = await import('zca-js');
    const zalo = new Zalo({ selfListen: false, checkUpdate: true, logging: true });

    let resolvedBotExternalId = sessionId;

    await zalo.loginQR(
      { userAgent: 'AskBase_BE', qrPath: undefined },
      async (event) => {
        switch (event.type) {
          case LoginQRCallbackEventType.QRCodeGenerated:
            this.logger.log(`Zalo QR generated for customer=${input.customerId}`);
            break;
          case LoginQRCallbackEventType.QRCodeExpired:
            this.logger.warn(`Zalo QR expired for customer=${input.customerId}`);
            break;
          case LoginQRCallbackEventType.GotLoginInfo: {
            const payload: ZaloSessionPayload = {
              cookie: event.data.cookie,
              imei: event.data.imei,
              userAgent: event.data.userAgent,
            };
            await this.sessions.save(input.customerId, payload);
            break;
          }
          case LoginQRCallbackEventType.QRCodeScanned:
            this.logger.log(`Zalo QR scanned by ${event.data.display_name}`);
            break;
          case LoginQRCallbackEventType.QRCodeDeclined:
            this.logger.warn(`Zalo QR declined: ${event.data.code}`);
            break;
        }
      },
    );

    const api = zalo;
    const context = typeof api.getContext === 'function' ? api.getContext() : null;
    if (context?.uid) resolvedBotExternalId = String(context.uid);

    this.instances.set(resolvedBotExternalId, api);
    this.listeners.attach(api, { id: input.customerId, externalId: resolvedBotExternalId });

    return {
      sessionId,
      hint: { kind: 'qr', data: { sessionId, botExternalId: resolvedBotExternalId } },
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
