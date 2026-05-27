import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ChannelType } from '@/shared/types';
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
import { ZaloSessionService } from './zalo-session.service';
import { ZaloNormalizer } from './zalo.normalizer';
import { ZaloListeners } from './zalo.listeners';

/**
 * Zalo channel adapter. Only this file (and helpers under ./) may import `zca-js`.
 *
 * Implementation is intentionally skeletal — wiring will be completed once
 * dependencies are installed and Zalo SDK types are available.
 */
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
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  // ---- IChannelAdapter ----

  async startLogin(_input: StartLoginInput): Promise<StartLoginResult> {
    const sessionId = randomUUID();
    // TODO: spawn login flow via zca-js loginQR (see plan §8.1) and push events
    // through RealtimeGateway. Resolve immediately with the sessionId so the FE
    // can subscribe to socket room `session:{sessionId}` first.
    this.logger.warn('ZaloAdapter.startLogin not implemented yet');
    return {
      sessionId,
      hint: { kind: 'qr', data: { sessionId } },
    };
  }

  async restore(botId: number): Promise<void> {
    const session = await this.sessions.load(botId);
    if (!session) return;
    // TODO: zca-js login({ cookie, imei, userAgent }); instances.set; listeners.attach
    this.logger.warn(`ZaloAdapter.restore(${botId}) not implemented yet`);
  }

  async logout(botId: number): Promise<void> {
    // TODO: stop listeners + drop from instances + sessions.clear + Bot.status=inactive
    this.logger.warn(`ZaloAdapter.logout(${botId}) not implemented yet`);
    await this.sessions.clear(botId);
  }

  async send(botExternalId: string, msg: OutboundMessage): Promise<SendResult> {
    const api = this.instances.get(botExternalId);
    if (!api) throw new ChannelOfflineError(botExternalId);
    // TODO: map OutboundMessage → zca-js payload + Promise.race with timeout(10s)
    void msg;
    throw new ChannelSendError('ZaloAdapter.send not implemented yet');
  }

  async status(botExternalId: string): Promise<ChannelStatus> {
    return this.instances.has(botExternalId) ? 'online' : 'offline';
  }
}
