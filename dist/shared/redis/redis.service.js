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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var RedisService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = __importDefault(require("ioredis"));
const app_config_1 = require("../config/app.config");
const RELEASE_LOCK_LUA = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;
let RedisService = RedisService_1 = class RedisService {
    config;
    logger = new common_1.Logger(RedisService_1.name);
    client;
    constructor(config) {
        this.config = config;
    }
    onModuleInit() {
        this.client = new ioredis_1.default(this.config.redisUrl, {
            maxRetriesPerRequest: null,
            enableReadyCheck: true,
        });
        this.client.on('error', (err) => this.logger.error(`Redis error: ${err.message}`));
        this.client.on('ready', () => this.logger.log('Redis ready'));
    }
    async onModuleDestroy() {
        if (this.client)
            await this.client.quit();
    }
    get raw() {
        return this.client;
    }
    async acquireLock(key, token, ttlMs) {
        const res = await this.client.set(key, token, 'PX', ttlMs, 'NX');
        return res === 'OK';
    }
    async releaseLock(key, token) {
        const res = (await this.client.eval(RELEASE_LOCK_LUA, 1, key, token));
        return res === 1;
    }
    async cacheGet(key) {
        const v = await this.client.get(key);
        return v ? JSON.parse(v) : null;
    }
    async cacheSet(key, value, ttlSec) {
        await this.client.set(key, JSON.stringify(value), 'EX', ttlSec);
    }
};
exports.RedisService = RedisService;
exports.RedisService = RedisService = RedisService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [app_config_1.AppConfig])
], RedisService);
//# sourceMappingURL=redis.service.js.map