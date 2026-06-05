"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationsModule = void 0;
const common_1 = require("@nestjs/common");
const zalo_module_1 = require("../channels/zalo/zalo.module");
const conversation_service_1 = require("./conversation.service");
const message_service_1 = require("./message.service");
const conversations_controller_1 = require("./conversations.controller");
const conversation_repository_1 = require("./repositories/conversation.repository");
const message_repository_1 = require("./repositories/message.repository");
let ConversationsModule = class ConversationsModule {
};
exports.ConversationsModule = ConversationsModule;
exports.ConversationsModule = ConversationsModule = __decorate([
    (0, common_1.Module)({
        imports: [(0, common_1.forwardRef)(() => zalo_module_1.ZaloModule)],
        controllers: [conversations_controller_1.ConversationsController],
        providers: [conversation_service_1.ConversationService, message_service_1.MessageService, conversation_repository_1.ConversationRepository, message_repository_1.MessageRepository],
        exports: [conversation_service_1.ConversationService, message_service_1.MessageService, conversation_repository_1.ConversationRepository, message_repository_1.MessageRepository],
    })
], ConversationsModule);
//# sourceMappingURL=conversations.module.js.map