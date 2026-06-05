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
exports.TelegramController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_customer_decorator_1 = require("../../shared/decorators/current-customer.decorator");
const telegram_adapter_1 = require("./telegram.adapter");
const register_bot_dto_1 = require("./dto/register-bot.dto");
let TelegramController = class TelegramController {
    adapter;
    constructor(adapter) {
        this.adapter = adapter;
    }
    async startLogin(customerId) {
        return this.adapter.startLogin({ customerId });
    }
    async registerBot(botId, customerId, body) {
        void customerId;
        await this.adapter.registerBot(Number(botId), body.token, body.webhookUrl);
        return { ok: true };
    }
    async logout(botId) {
        await this.adapter.logout(Number(botId));
        return { ok: true };
    }
};
exports.TelegramController = TelegramController;
__decorate([
    (0, common_1.Post)('login'),
    __param(0, (0, current_customer_decorator_1.CurrentCustomer)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], TelegramController.prototype, "startLogin", null);
__decorate([
    (0, common_1.Post)('register/:botId'),
    __param(0, (0, common_1.Param)('botId')),
    __param(1, (0, current_customer_decorator_1.CurrentCustomer)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, register_bot_dto_1.RegisterTelegramBotDto]),
    __metadata("design:returntype", Promise)
], TelegramController.prototype, "registerBot", null);
__decorate([
    (0, common_1.Post)('logout/:botId'),
    __param(0, (0, common_1.Param)('botId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TelegramController.prototype, "logout", null);
exports.TelegramController = TelegramController = __decorate([
    (0, swagger_1.ApiTags)('channels'),
    (0, swagger_1.ApiBearerAuth)('jwt'),
    (0, common_1.Controller)('channels/telegram'),
    __metadata("design:paramtypes", [telegram_adapter_1.TelegramAdapter])
], TelegramController);
//# sourceMappingURL=telegram.controller.js.map