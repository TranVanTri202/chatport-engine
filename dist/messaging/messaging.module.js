"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingModule = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const cqrs_1 = require("@nestjs/cqrs");
const types_1 = require("../shared/types");
const conversations_module_1 = require("../conversations/conversations.module");
const realtime_module_1 = require("../realtime/realtime.module");
const bot_module_1 = require("../bot/bot.module");
const quota_module_1 = require("../quota/quota.module");
const rag_module_1 = require("../rag/rag.module");
const llm_module_1 = require("../llm/llm.module");
const zalo_module_1 = require("../channels/zalo/zalo.module");
const messaging_publisher_1 = require("./messaging.publisher");
const message_handler_1 = require("./message.handler");
const reply_policy_service_1 = require("./reply-policy.service");
const inbound_processor_1 = require("./inbound.processor");
const outbound_processor_1 = require("./outbound.processor");
const messages_controller_1 = require("./messages.controller");
const send_message_handler_1 = require("./commands/send-message.handler");
const send_message_validation_service_1 = require("./send-message-validation.service");
const outbound_message_mapper_1 = require("./outbound-message.mapper");
let MessagingModule = class MessagingModule {
};
exports.MessagingModule = MessagingModule;
exports.MessagingModule = MessagingModule = __decorate([
    (0, common_1.Module)({
        imports: [
            bullmq_1.BullModule.registerQueue({ name: types_1.MESSAGING_INBOUND_QUEUE }, { name: types_1.MESSAGING_OUTBOUND_QUEUE }),
            cqrs_1.CqrsModule,
            (0, common_1.forwardRef)(() => conversations_module_1.ConversationsModule),
            realtime_module_1.RealtimeModule,
            (0, common_1.forwardRef)(() => bot_module_1.BotModule),
            quota_module_1.QuotaModule,
            (0, common_1.forwardRef)(() => rag_module_1.RagModule),
            llm_module_1.LlmModule,
            (0, common_1.forwardRef)(() => zalo_module_1.ZaloModule),
        ],
        controllers: [messages_controller_1.MessagesController],
        providers: [
            messaging_publisher_1.MessagingPublisher,
            message_handler_1.MessageHandler,
            reply_policy_service_1.ReplyPolicyService,
            inbound_processor_1.InboundProcessor,
            outbound_processor_1.OutboundProcessor,
            send_message_handler_1.SendMessageHandler,
            send_message_validation_service_1.SendMessageValidationService,
            outbound_message_mapper_1.OutboundMessageMapper,
        ],
        exports: [
            messaging_publisher_1.MessagingPublisher,
            reply_policy_service_1.ReplyPolicyService,
            bullmq_1.BullModule,
        ],
    })
], MessagingModule);
//# sourceMappingURL=messaging.module.js.map