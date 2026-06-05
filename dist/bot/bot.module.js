"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotModule = void 0;
const common_1 = require("@nestjs/common");
const bot_service_1 = require("./bot.service");
const bot_controller_1 = require("./bot.controller");
const bot_response_service_1 = require("./bot-response.service");
const bot_repository_1 = require("./repositories/bot.repository");
const conversations_module_1 = require("../conversations/conversations.module");
const rag_module_1 = require("../rag/rag.module");
const llm_module_1 = require("../llm/llm.module");
const messaging_module_1 = require("../messaging/messaging.module");
const quota_module_1 = require("../quota/quota.module");
let BotModule = class BotModule {
};
exports.BotModule = BotModule;
exports.BotModule = BotModule = __decorate([
    (0, common_1.Module)({
        imports: [
            (0, common_1.forwardRef)(() => conversations_module_1.ConversationsModule),
            (0, common_1.forwardRef)(() => rag_module_1.RagModule),
            llm_module_1.LlmModule,
            (0, common_1.forwardRef)(() => messaging_module_1.MessagingModule),
            (0, common_1.forwardRef)(() => quota_module_1.QuotaModule),
        ],
        controllers: [bot_controller_1.BotController],
        providers: [bot_service_1.BotService, bot_response_service_1.BotResponseService, bot_repository_1.BotRepository],
        exports: [bot_service_1.BotService, bot_response_service_1.BotResponseService, bot_repository_1.BotRepository],
    })
], BotModule);
//# sourceMappingURL=bot.module.js.map