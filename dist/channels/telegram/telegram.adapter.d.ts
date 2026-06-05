import { OnModuleInit } from '@nestjs/common';
import { ChannelType } from '@/shared/types';
import { ChannelStatus, IChannelAdapter, OutboundMessage, SendResult, StartLoginInput, StartLoginResult } from '../channel-adapter.interface';
import { ChannelRegistry } from '../channel-registry.service';
import { TelegramListeners } from './telegram.listeners';
import { TelegramSessionService } from './telegram-session.service';
export declare class TelegramAdapter implements IChannelAdapter, OnModuleInit {
    private readonly registry;
    private readonly sessions;
    private readonly listeners;
    readonly channel = ChannelType.telegram;
    private readonly logger;
    private readonly instances;
    constructor(registry: ChannelRegistry, sessions: TelegramSessionService, listeners: TelegramListeners);
    onModuleInit(): void;
    startLogin(input: StartLoginInput): Promise<StartLoginResult>;
    registerBot(botId: number, botToken: string, webhookUrl?: string): Promise<void>;
    restore(botId: number): Promise<void>;
    logout(botId: number): Promise<void>;
    send(botExternalId: string, msg: OutboundMessage): Promise<SendResult>;
    private sendByType;
    private sendText;
    private sendImage;
    status(botExternalId: string): Promise<ChannelStatus>;
}
