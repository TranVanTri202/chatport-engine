import { Injectable, NotImplementedException, OnModuleInit } from '@nestjs/common';
import { ChannelType } from '@/shared/types';
import {
  ChannelStatus,
  IChannelAdapter,
  OutboundMessage,
  SendResult,
  StartLoginResult,
} from '../channel-adapter.interface';
import { ChannelRegistry } from '../channel-registry.service';

/**
 * Telegram channel — scaffold only. Confirms the plug-in architecture works:
 * the module registers with ChannelRegistry on boot but every action throws
 * `NotImplementedException` explicitly (no silent 500s).
 *
 * Implementation will be added in a later milestone (see README in this dir).
 */
@Injectable()
export class TelegramAdapter implements IChannelAdapter, OnModuleInit {
  readonly channel = ChannelType.telegram;

  constructor(private readonly registry: ChannelRegistry) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async startLogin(): Promise<StartLoginResult> {
    throw new NotImplementedException('Telegram channel coming soon');
  }

  async restore(): Promise<void> {
    // no-op
  }

  async logout(): Promise<void> {
    throw new NotImplementedException('Telegram channel coming soon');
  }

  async send(_botExternalId: string, _msg: OutboundMessage): Promise<SendResult> {
    throw new NotImplementedException('Telegram channel coming soon');
  }

  async status(): Promise<ChannelStatus> {
    return 'offline';
  }
}
