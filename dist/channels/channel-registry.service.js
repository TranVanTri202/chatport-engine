"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ChannelRegistry_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChannelRegistry = void 0;
const common_1 = require("@nestjs/common");
let ChannelRegistry = ChannelRegistry_1 = class ChannelRegistry {
    logger = new common_1.Logger(ChannelRegistry_1.name);
    map = new Map();
    register(adapter) {
        if (this.map.has(adapter.channel)) {
            throw new Error(`Channel adapter already registered: ${adapter.channel}`);
        }
        this.map.set(adapter.channel, adapter);
        this.logger.log(`Registered channel adapter: ${adapter.channel}`);
    }
    get(channel) {
        const adapter = this.map.get(channel);
        if (!adapter)
            throw new Error(`No adapter for channel ${channel}`);
        return adapter;
    }
    list() {
        return Array.from(this.map.keys());
    }
};
exports.ChannelRegistry = ChannelRegistry;
exports.ChannelRegistry = ChannelRegistry = ChannelRegistry_1 = __decorate([
    (0, common_1.Injectable)()
], ChannelRegistry);
//# sourceMappingURL=channel-registry.service.js.map