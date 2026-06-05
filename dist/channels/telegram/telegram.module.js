"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramModule = void 0;
const common_1 = require("@nestjs/common");
const messaging_module_1 = require("../../messaging/messaging.module");
const telegram_adapter_1 = require("./telegram.adapter");
const telegram_controller_1 = require("./telegram.controller");
const telegram_listeners_1 = require("./telegram.listeners");
const telegram_session_service_1 = require("./telegram-session.service");
let TelegramModule = class TelegramModule {
};
exports.TelegramModule = TelegramModule;
exports.TelegramModule = TelegramModule = __decorate([
    (0, common_1.Module)({
        imports: [messaging_module_1.MessagingModule],
        controllers: [telegram_controller_1.TelegramController],
        providers: [telegram_adapter_1.TelegramAdapter, telegram_listeners_1.TelegramListeners, telegram_session_service_1.TelegramSessionService],
        exports: [telegram_adapter_1.TelegramAdapter],
    })
], TelegramModule);
//# sourceMappingURL=telegram.module.js.map