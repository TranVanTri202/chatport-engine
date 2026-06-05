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
var TelegramListeners_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramListeners = void 0;
const common_1 = require("@nestjs/common");
const messaging_publisher_1 = require("../../messaging/messaging.publisher");
const types_1 = require("../../shared/types");
let TelegramListeners = TelegramListeners_1 = class TelegramListeners {
    publisher;
    logger = new common_1.Logger(TelegramListeners_1.name);
    constructor(publisher) {
        this.publisher = publisher;
    }
    attach(bot, botExternalId) {
        bot.on('message', async (ctx) => {
            try {
                const normalized = this.normalizeMessage(botExternalId, ctx.message, ctx);
                await this.publisher.publishInbound(normalized);
            }
            catch (error) {
                this.logger.error(`Failed to handle Telegram message for bot=${botExternalId}: ${error.message}`);
            }
        });
    }
    normalizeMessage(botExternalId, message, ctx) {
        const from = message.from ?? {};
        const chat = message.chat ?? {};
        const text = message.text ?? message.caption;
        const threadId = String(chat.id ?? from.id ?? '');
        return {
            channel: types_1.ChannelType.telegram,
            botExternalId,
            threadId,
            threadType: chat.type === 'group' || chat.type === 'supergroup' ? types_1.ThreadType.group : types_1.ThreadType.user,
            senderExternalId: String(from.id ?? threadId),
            senderName: [from.first_name, from.last_name].filter(Boolean).join(' ') || from.username,
            messageExternalId: String(message.message_id ?? `${Date.now()}`),
            timestamp: Number(message.date ? message.date * 1000 : Date.now()),
            type: typeof text === 'string' ? 'chat' : 'unknown',
            text: typeof text === 'string' ? text : undefined,
            attachments: [],
            raw: { message, update: ctx.update },
        };
    }
};
exports.TelegramListeners = TelegramListeners;
exports.TelegramListeners = TelegramListeners = TelegramListeners_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [messaging_publisher_1.MessagingPublisher])
], TelegramListeners);
//# sourceMappingURL=telegram.listeners.js.map