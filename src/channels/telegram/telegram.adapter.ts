import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ChannelType, ThreadType } from '@/shared/types';
import {
  ChannelOfflineError,
  ChannelSendError,
} from '@/shared/errors/channel.errors';
import {
  ChannelStatus,
  IChannelAdapter,
  OutboundMessage,
  SendResult,
  StartLoginInput,
  StartLoginResult,
} from '../channel-adapter.interface';
import { ChannelRegistry } from '../channel-registry.service';
import { TelegramListeners } from './telegram.listeners';
import { TelegramSessionPayload, TelegramSessionService } from './telegram-session.service';

@Injectable()
export class TelegramAdapter implements IChannelAdapter, OnModuleInit {
  readonly channel = ChannelType.telegram;

  private readonly logger = new Logger(TelegramAdapter.name);
  private readonly instances = new Map<string, any>();

  constructor(
    private readonly registry: ChannelRegistry,
    private readonly sessions: TelegramSessionService,
    private readonly listeners: TelegramListeners,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async startLogin(input: StartLoginInput): Promise<StartLoginResult> {
    const sessionId = randomUUID();
    this.logger.log(`Telegram login initiated for customer=${input.customerId}`);
    return {
      sessionId,
      hint: { kind: 'token', data: { sessionId, message: 'Provide Telegram bot token' } },
    };
  }

  async registerBot(botId: number, botToken: string, webhookUrl?: string): Promise<void> {
    void botId;
    void botToken;
    void webhookUrl;

    throw new Error(
      'Telegram support is disabled in this environment because the telegraf package is not installed.',
    );
  }

  async restore(botId: number): Promise<void> {
    const session = await this.sessions.load(botId);
    if (!session) return;
    await this.registerBot(botId, session.botToken, session.webhookUrl);
  }

  async logout(botId: number): Promise<void> {
    const bot = this.instances.get(String(botId));
    if (bot?.stop) await bot.stop();
    if (bot?.telegram?.deleteWebhook) await bot.telegram.deleteWebhook();
    this.instances.delete(String(botId));
    await this.sessions.clear(botId);
  }

  async send(botExternalId: string, msg: OutboundMessage): Promise<SendResult> {
    const bot = this.instances.get(botExternalId);
    if (!bot) throw new ChannelOfflineError(botExternalId);

    try {
      if (msg.text) {
        await bot.telegram.sendMessage(msg.threadId, msg.text);
      }
      return { messageExternalId: null, sentAt: Date.now() };
    } catch (error) {
      throw new ChannelSendError(
        `Failed to send Telegram message: ${(error as Error).message}`,
      );
    }
  }

  async status(botExternalId: string): Promise<ChannelStatus> {
    return this.instances.has(botExternalId) ? 'online' : 'offline';
  }
}
