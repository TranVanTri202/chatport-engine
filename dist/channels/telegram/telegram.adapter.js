"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var TelegramAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramAdapter = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const types_1 = require("../../shared/types");
const channel_errors_1 = require("../../shared/errors/channel.errors");
const channel_registry_service_1 = require("../channel-registry.service");
const telegram_listeners_1 = require("./telegram.listeners");
const telegram_session_service_1 = require("./telegram-session.service");
let TelegramAdapter = TelegramAdapter_1 = class TelegramAdapter {
    registry;
    sessions;
    listeners;
    channel = types_1.ChannelType.telegram;
    logger = new common_1.Logger(TelegramAdapter_1.name);
    instances = new Map();
    constructor(registry, sessions, listeners) {
        this.registry = registry;
        this.sessions = sessions;
        this.listeners = listeners;
    }
    onModuleInit() {
        this.registry.register(this);
    }
    async startLogin(input) {
        const sessionId = (0, node_crypto_1.randomUUID)();
        this.logger.log(`Telegram login initiated for customer=${input.customerId}`);
        return {
            sessionId,
            hint: { kind: 'token', data: { sessionId, message: 'Provide Telegram bot token' } },
        };
    }
    async registerBot(botId, botToken, webhookUrl) {
        void botId;
        void botToken;
        void webhookUrl;
        throw new Error('Telegram support is disabled in this environment because the telegraf package is not installed.');
    }
    async restore(botId) {
        const session = await this.sessions.load(botId);
        if (!session)
            return;
        await this.registerBot(botId, session.botToken, session.webhookUrl);
    }
    async logout(botId) {
        const bot = this.instances.get(String(botId));
        if (bot?.stop)
            await bot.stop();
        if (bot?.telegram?.deleteWebhook)
            await bot.telegram.deleteWebhook();
        this.instances.delete(String(botId));
        await this.sessions.clear(botId);
    }
    async send(botExternalId, msg) {
        const bot = this.instances.get(botExternalId);
        if (!bot)
            throw new channel_errors_1.ChannelOfflineError(botExternalId);
        try {
            await this.sendByType(bot, msg);
            return { messageExternalId: null, sentAt: Date.now() };
        }
        catch (error) {
            if (error instanceof channel_errors_1.ChannelSendError)
                throw error;
            throw new channel_errors_1.ChannelSendError(`Failed to send Telegram message: ${error.message}`);
        }
    }
    async sendByType(bot, msg) {
        switch (msg.type) {
            case 'chat':
                return this.sendText(bot, msg.threadId, msg.text);
            case 'image':
                return this.sendImage(bot, msg.threadId, msg.text, msg.attachments);
            default:
                throw new channel_errors_1.ChannelSendError(`Unsupported outbound message type: ${msg.type}`);
        }
    }
    async sendText(bot, threadId, text) {
        if (!text?.trim()) {
            throw new channel_errors_1.ChannelSendError('Text is required for chat messages');
        }
        await bot.telegram.sendMessage(threadId, text);
    }
    async sendImage(bot, threadId, text, attachments) {
        if (!attachments?.length) {
            throw new channel_errors_1.ChannelSendError('Image attachment is required for image messages');
        }
        const [first] = attachments;
        await bot.telegram.sendPhoto(threadId, first.url, { caption: first.caption ?? text ?? '' });
    }
    async status(botExternalId) {
        return this.instances.has(botExternalId) ? 'online' : 'offline';
    }
};
exports.TelegramAdapter = TelegramAdapter;
exports.TelegramAdapter = TelegramAdapter = TelegramAdapter_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [channel_registry_service_1.ChannelRegistry,
        telegram_session_service_1.TelegramSessionService,
        telegram_listeners_1.TelegramListeners])
], TelegramAdapter);
//# sourceMappingURL=telegram.adapter.js.map