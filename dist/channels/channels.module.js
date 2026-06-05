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
var ChannelsModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChannelsModule = void 0;
const common_1 = require("@nestjs/common");
const channel_registry_service_1 = require("./channel-registry.service");
const channels_controller_1 = require("./channels.controller");
const channel_core_module_1 = require("./channel-core.module");
const zalo_module_1 = require("./zalo/zalo.module");
const telegram_module_1 = require("./telegram/telegram.module");
let ChannelsModule = ChannelsModule_1 = class ChannelsModule {
    registry;
    logger = new common_1.Logger(ChannelsModule_1.name);
    constructor(registry) {
        this.registry = registry;
    }
    onApplicationBootstrap() {
        this.logger.log(`ChannelRegistry registered: [${this.registry.list().join(', ')}]`);
    }
};
exports.ChannelsModule = ChannelsModule;
exports.ChannelsModule = ChannelsModule = ChannelsModule_1 = __decorate([
    (0, common_1.Module)({
        imports: [channel_core_module_1.ChannelCoreModule, zalo_module_1.ZaloModule, telegram_module_1.TelegramModule],
        controllers: [channels_controller_1.ChannelsController],
    }),
    __metadata("design:paramtypes", [channel_registry_service_1.ChannelRegistry])
], ChannelsModule);
//# sourceMappingURL=channels.module.js.map