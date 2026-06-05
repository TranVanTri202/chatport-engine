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
exports.ChannelsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_customer_decorator_1 = require("../shared/decorators/current-customer.decorator");
const types_1 = require("../shared/types");
const channel_registry_service_1 = require("./channel-registry.service");
let ChannelsController = class ChannelsController {
    registry;
    constructor(registry) {
        this.registry = registry;
    }
    async startLogin(customerId, channel) {
        const ch = this.parseChannel(channel);
        const adapter = this.registry.get(ch);
        return adapter.startLogin({ customerId });
    }
    async logout(channel, botId) {
        const ch = this.parseChannel(channel);
        const adapter = this.registry.get(ch);
        await adapter.logout(Number(botId));
        return { ok: true };
    }
    parseChannel(raw) {
        const ch = raw;
        if (!Object.values(types_1.ChannelType).includes(ch)) {
            throw new common_1.BadRequestException(`Unknown channel: ${raw}`);
        }
        return ch;
    }
};
exports.ChannelsController = ChannelsController;
__decorate([
    (0, common_1.Post)(':channel/login'),
    __param(0, (0, current_customer_decorator_1.CurrentCustomer)()),
    __param(1, (0, common_1.Param)('channel')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String]),
    __metadata("design:returntype", Promise)
], ChannelsController.prototype, "startLogin", null);
__decorate([
    (0, common_1.Post)(':channel/logout/:botId'),
    __param(0, (0, common_1.Param)('channel')),
    __param(1, (0, common_1.Param)('botId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ChannelsController.prototype, "logout", null);
exports.ChannelsController = ChannelsController = __decorate([
    (0, swagger_1.ApiTags)('channels'),
    (0, swagger_1.ApiBearerAuth)('jwt'),
    (0, common_1.Controller)('channels'),
    __metadata("design:paramtypes", [channel_registry_service_1.ChannelRegistry])
], ChannelsController);
//# sourceMappingURL=channels.controller.js.map