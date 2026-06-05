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
exports.MessagesController = void 0;
const common_1 = require("@nestjs/common");
const cqrs_1 = require("@nestjs/cqrs");
const swagger_1 = require("@nestjs/swagger");
const platform_express_1 = require("@nestjs/platform-express");
const send_message_command_1 = require("./commands/send-message.command");
const send_text_message_dto_1 = require("./dto/send-text-message.dto");
const send_image_file_dto_1 = require("./dto/send-image-file.dto");
const types_1 = require("../shared/types");
const bot_service_1 = require("../bot/bot.service");
const conversation_service_1 = require("../conversations/conversation.service");
const message_service_1 = require("../conversations/message.service");
const retrieval_service_1 = require("../rag/retrieval.service");
const llm_service_1 = require("../llm/llm.service");
const app_config_1 = require("../shared/config/app.config");
const bot_response_service_1 = require("../bot/bot-response.service");
const react_message_dto_1 = require("./dto/react-message.dto");
const zalo_zca_service_1 = require("../channels/zalo/zalo-zca.service");
let MessagesController = class MessagesController {
    commands;
    bots;
    conversations;
    messages;
    retrieval;
    llm;
    config;
    botResponse;
    zaloZca;
    constructor(commands, bots, conversations, messages, retrieval, llm, config, botResponse, zaloZca) {
        this.commands = commands;
        this.bots = bots;
        this.conversations = conversations;
        this.messages = messages;
        this.retrieval = retrieval;
        this.llm = llm;
        this.config = config;
        this.botResponse = botResponse;
        this.zaloZca = zaloZca;
    }
    sendText(body) {
        return this.commands.execute(new send_message_command_1.SendMessageCommand({
            botExternalId: body.botExternalId,
            threadId: body.threadId,
            threadType: body.threadType,
            type: types_1.MessageType.chat,
            text: body.text,
            quote: body.quoteMessageExternalId ? { messageExternalId: body.quoteMessageExternalId } : undefined,
        }));
    }
    sendImage(body, file) {
        if (!file)
            throw new common_1.BadRequestException('file is required');
        return this.commands.execute(new send_message_command_1.SendMessageCommand({
            botExternalId: body.botExternalId,
            threadId: body.threadId,
            threadType: body.threadType,
            type: types_1.MessageType.image,
            text: body.caption,
            attachments: [
                {
                    url: `data:${file.mimetype};name=${encodeURIComponent(file.originalname)};base64,${file.buffer.toString('base64')}`,
                },
            ],
            quote: body.quoteMessageExternalId ? { messageExternalId: body.quoteMessageExternalId } : undefined,
        }));
    }
    async reactMessage(body) {
        await this.zaloZca.addReaction(body.botExternalId, body.threadId, body.threadType === 'group' ? 1 : 0, body.messageExternalId, body.reactIcon);
        return { success: true };
    }
};
exports.MessagesController = MessagesController;
__decorate([
    (0, common_1.Post)('send/text'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [send_text_message_dto_1.SendTextMessageDto]),
    __metadata("design:returntype", void 0)
], MessagesController.prototype, "sendText", null);
__decorate([
    (0, common_1.Post)('send/image'),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            required: ['botExternalId', 'threadId', 'threadType', 'file'],
            properties: {
                botExternalId: { type: 'string' },
                threadId: { type: 'string' },
                threadType: { type: 'string', enum: ['user', 'group'] },
                caption: { type: 'string' },
                quoteMessageExternalId: { type: 'string' },
                file: { type: 'string', format: 'binary' },
            },
        },
    }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [send_image_file_dto_1.SendImageFileDto, Object]),
    __metadata("design:returntype", void 0)
], MessagesController.prototype, "sendImage", null);
__decorate([
    (0, common_1.Post)('react'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [react_message_dto_1.ReactMessageDto]),
    __metadata("design:returntype", Promise)
], MessagesController.prototype, "reactMessage", null);
exports.MessagesController = MessagesController = __decorate([
    (0, swagger_1.ApiTags)('messages'),
    (0, swagger_1.ApiBearerAuth)('jwt'),
    (0, common_1.Controller)('messages'),
    __metadata("design:paramtypes", [cqrs_1.CommandBus,
        bot_service_1.BotService,
        conversation_service_1.ConversationService,
        message_service_1.MessageService,
        retrieval_service_1.RetrievalService,
        llm_service_1.LlmService,
        app_config_1.AppConfig,
        bot_response_service_1.BotResponseService,
        zalo_zca_service_1.ZaloZcaService])
], MessagesController);
//# sourceMappingURL=messages.controller.js.map