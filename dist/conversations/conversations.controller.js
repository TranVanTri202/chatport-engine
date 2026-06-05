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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const conversation_service_1 = require("./conversation.service");
const message_service_1 = require("./message.service");
const list_conversations_dto_1 = require("./dto/list-conversations.dto");
let ConversationsController = class ConversationsController {
    conversations;
    messageService;
    constructor(conversations, messageService) {
        this.conversations = conversations;
        this.messageService = messageService;
    }
    async list(channel, externalId, query) {
        return this.conversations.listForBot({
            channel: channel,
            externalId,
            limit: query.limit,
            cursor: query.cursor,
        });
    }
    detail(id) {
        return this.conversations.getById(id);
    }
    participants(id, query) {
        return this.conversations.listParticipants({
            conversationId: id,
            limit: query.limit,
            cursor: query.cursor,
        });
    }
    messages(id, query) {
        return this.messageService.listByConversation({
            conversationId: id,
            limit: query.limit,
            cursor: query.cursor,
        });
    }
    async markRead(id) {
        await this.conversations.markRead(id);
        return { ok: true };
    }
    async toggleAutoReply(id, body) {
        await this.conversations.updateAutoReply(id, body.autoReplyEnabled);
        return { ok: true };
    }
};
exports.ConversationsController = ConversationsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Param)('channel')),
    __param(1, (0, common_1.Param)('externalId')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, list_conversations_dto_1.ListConversationsQuery]),
    __metadata("design:returntype", Promise)
], ConversationsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], ConversationsController.prototype, "detail", null);
__decorate([
    (0, common_1.Get)(':id/participants'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, list_conversations_dto_1.ListParticipantsQuery]),
    __metadata("design:returntype", void 0)
], ConversationsController.prototype, "participants", null);
__decorate([
    (0, common_1.Get)(':id/messages'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, list_conversations_dto_1.ListMessagesQuery]),
    __metadata("design:returntype", void 0)
], ConversationsController.prototype, "messages", null);
__decorate([
    (0, common_1.Post)(':id/read'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], ConversationsController.prototype, "markRead", null);
__decorate([
    (0, common_1.Patch)(':id/auto-reply'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], ConversationsController.prototype, "toggleAutoReply", null);
exports.ConversationsController = ConversationsController = __decorate([
    (0, swagger_1.ApiTags)('conversations'),
    (0, swagger_1.ApiBearerAuth)('jwt'),
    (0, common_1.Controller)('bots/:channel/:externalId/conversations'),
    __metadata("design:paramtypes", [conversation_service_1.ConversationService,
        message_service_1.MessageService])
], ConversationsController);
//# sourceMappingURL=conversations.controller.js.map