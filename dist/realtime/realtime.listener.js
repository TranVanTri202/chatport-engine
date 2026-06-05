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
exports.RealtimeListener = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const domain_events_1 = require("../shared/events/domain-events");
const realtime_gateway_1 = require("./realtime.gateway");
let RealtimeListener = class RealtimeListener {
    gateway;
    constructor(gateway) {
        this.gateway = gateway;
    }
    onReceived(e) {
        this.gateway.emitToCustomer(e.bot.customerId, 'message:new', {
            conversationId: e.conversation.id,
            messageId: e.messageId,
            direction: e.inbound.isSelf ? 'out' : 'in',
            text: e.inbound.text,
            attachments: e.inbound.attachments,
            senderExternalId: e.inbound.senderExternalId,
            ts: e.inbound.timestamp,
        });
    }
    onSent(e) {
        this.gateway.emitToCustomer(e.bot.customerId, 'message:sent', {
            conversationId: e.conversationId,
            messageId: e.messageId,
            direction: 'out',
            text: e.outbound.text,
            attachments: e.outbound.attachments ?? [],
            ts: e.sentAt,
        });
    }
    onBotStatus(e) {
        this.gateway.emitToCustomer(e.customerId, 'bot:status', {
            botId: e.botId,
            from: e.from,
            to: e.to,
            reason: e.reason,
        });
    }
    onDocStatus(e) {
        this.gateway.emitToCustomer(e.document.botId, 'document:status', {
            documentId: e.document.id,
            from: e.from,
            to: e.to,
            error: e.error,
        });
    }
    onReacted(e) {
        this.gateway.emitToCustomer(e.customerId, 'message:reaction', {
            conversationId: e.conversationId,
            messageExternalId: e.messageExternalId,
            reactions: e.reactions,
        });
    }
};
exports.RealtimeListener = RealtimeListener;
__decorate([
    (0, event_emitter_1.OnEvent)(domain_events_1.DOMAIN_EVENTS.MessageReceived),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RealtimeListener.prototype, "onReceived", null);
__decorate([
    (0, event_emitter_1.OnEvent)(domain_events_1.DOMAIN_EVENTS.MessageSent),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RealtimeListener.prototype, "onSent", null);
__decorate([
    (0, event_emitter_1.OnEvent)(domain_events_1.DOMAIN_EVENTS.BotStatusChanged),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RealtimeListener.prototype, "onBotStatus", null);
__decorate([
    (0, event_emitter_1.OnEvent)(domain_events_1.DOMAIN_EVENTS.DocumentStatusChanged),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RealtimeListener.prototype, "onDocStatus", null);
__decorate([
    (0, event_emitter_1.OnEvent)(domain_events_1.DOMAIN_EVENTS.MessageReacted),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RealtimeListener.prototype, "onReacted", null);
exports.RealtimeListener = RealtimeListener = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [realtime_gateway_1.RealtimeGateway])
], RealtimeListener);
//# sourceMappingURL=realtime.listener.js.map