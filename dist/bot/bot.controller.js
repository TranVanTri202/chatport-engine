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
exports.BotController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_customer_decorator_1 = require("../shared/decorators/current-customer.decorator");
const types_1 = require("../shared/types");
const bot_service_1 = require("./bot.service");
const create_bot_dto_1 = require("./dto/create-bot.dto");
let BotController = class BotController {
    bots;
    constructor(bots) {
        this.bots = bots;
    }
    list(customerId) {
        return this.bots.list(customerId);
    }
    detail(channel, externalId) {
        return this.bots.getByExternal(channel, externalId).then((bot) => ({ bot }));
    }
    create(customerId, body) {
        return this.bots.create({ ...body, customerId });
    }
    update(channel, externalId, body) {
        return this.bots.getByExternal(channel, externalId).then((bot) => this.bots.update(bot.id, body));
    }
    getTemperature(channel, externalId) {
        return this.bots.getByExternal(channel, externalId).then(({ temperature }) => ({ temperature: temperature ?? 0.5 }));
    }
    updateTemperature(channel, externalId, body) {
        return this.bots.getByExternal(channel, externalId).then((bot) => this.bots.update(bot.id, { temperature: body.temperature }));
    }
    async remove(channel, externalId) {
        const bot = await this.bots.getByExternal(channel, externalId);
        await this.bots.delete(bot.id);
        return { ok: true };
    }
    getSystemPrompt(channel, externalId) {
        return this.bots.getSystemPrompt(channel, externalId).then((systemPrompt) => ({ systemPrompt }));
    }
    updateSystemPrompt(channel, externalId, body) {
        return this.bots.updateSystemPrompt(channel, externalId, body.systemPrompt);
    }
};
exports.BotController = BotController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_customer_decorator_1.CurrentCustomer)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], BotController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':channel/:externalId'),
    __param(0, (0, common_1.Param)('channel')),
    __param(1, (0, common_1.Param)('externalId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], BotController.prototype, "detail", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_customer_decorator_1.CurrentCustomer)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, create_bot_dto_1.CreateBotBodyDto]),
    __metadata("design:returntype", void 0)
], BotController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':channel/:externalId'),
    __param(0, (0, common_1.Param)('channel')),
    __param(1, (0, common_1.Param)('externalId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, create_bot_dto_1.UpdateBotDto]),
    __metadata("design:returntype", void 0)
], BotController.prototype, "update", null);
__decorate([
    (0, common_1.Get)(':channel/:externalId/temperature'),
    __param(0, (0, common_1.Param)('channel')),
    __param(1, (0, common_1.Param)('externalId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], BotController.prototype, "getTemperature", null);
__decorate([
    (0, common_1.Patch)(':channel/:externalId/temperature'),
    __param(0, (0, common_1.Param)('channel')),
    __param(1, (0, common_1.Param)('externalId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, create_bot_dto_1.UpdateTemperatureDto]),
    __metadata("design:returntype", void 0)
], BotController.prototype, "updateTemperature", null);
__decorate([
    (0, common_1.Delete)(':channel/:externalId'),
    __param(0, (0, common_1.Param)('channel')),
    __param(1, (0, common_1.Param)('externalId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], BotController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)(':channel/:externalId/system-prompt'),
    __param(0, (0, common_1.Param)('channel')),
    __param(1, (0, common_1.Param)('externalId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], BotController.prototype, "getSystemPrompt", null);
__decorate([
    (0, common_1.Patch)(':channel/:externalId/system-prompt'),
    __param(0, (0, common_1.Param)('channel')),
    __param(1, (0, common_1.Param)('externalId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, create_bot_dto_1.UpdateSystemPromptDto]),
    __metadata("design:returntype", void 0)
], BotController.prototype, "updateSystemPrompt", null);
exports.BotController = BotController = __decorate([
    (0, swagger_1.ApiTags)('bots'),
    (0, swagger_1.ApiBearerAuth)('jwt'),
    (0, common_1.Controller)('bots'),
    __metadata("design:paramtypes", [bot_service_1.BotService])
], BotController);
//# sourceMappingURL=bot.controller.js.map