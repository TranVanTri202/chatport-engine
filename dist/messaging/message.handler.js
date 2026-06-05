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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageHandler = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const conversation_service_1 = require("../conversations/conversation.service");
const message_service_1 = require("../conversations/message.service");
const types_1 = require("../shared/types");
const domain_events_1 = require("../shared/events/domain-events");
let MessageHandler = class MessageHandler {
    conversations;
    messages;
    events;
    constructor(conversations, messages, events) {
        this.conversations = conversations;
        this.messages = messages;
        this.events = events;
    }
    async handle(msg) {
        const { conversation, bot } = await this.conversations.upsertFromInbound(msg);
        const persisted = await this.messages.persistInbound({
            conversationId: conversation.id,
            direction: msg.isSelf ? types_1.MessageDirection.out : types_1.MessageDirection.in,
            msg,
        });
        const event = {
            bot,
            conversation,
            inbound: msg,
            messageId: persisted.id.toString(),
        };
        this.events.emit(domain_events_1.DOMAIN_EVENTS.MessageReceived, event);
    }
};
exports.MessageHandler = MessageHandler;
exports.MessageHandler = MessageHandler = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [conversation_service_1.ConversationService,
        message_service_1.MessageService,
        event_emitter_1.EventEmitter2])
], MessageHandler);
//# sourceMappingURL=message.handler.js.map