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
var EmbeddingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbeddingService = void 0;
const common_1 = require("@nestjs/common");
const openai_1 = require("@langchain/openai");
const app_config_1 = require("../shared/config/app.config");
const redis_service_1 = require("../shared/redis/redis.service");
const timeout_1 = require("../shared/utils/timeout");
const QUERY_CACHE_TTL_SEC = 60;
const BATCH_SIZE = 100;
let EmbeddingService = EmbeddingService_1 = class EmbeddingService {
    config;
    redis;
    logger = new common_1.Logger(EmbeddingService_1.name);
    embeddings;
    constructor(config, redis) {
        this.config = config;
        this.redis = redis;
        this.embeddings = new openai_1.OpenAIEmbeddings({
            apiKey: config.openAiKey,
            model: config.embeddingModel,
            batchSize: BATCH_SIZE,
        });
    }
    async embedQuery(query) {
        const model = this.config.embeddingModel;
        const dims = this.config.embeddingDims;
        const key = `embed:q:${model}:${dims}:${(0, timeout_1.sha1Hex)(query)}`;
        const cached = await this.redis.cacheGet(key);
        if (cached)
            return cached;
        const vec = await this.embeddings.embedQuery(query);
        await this.redis.cacheSet(key, vec, QUERY_CACHE_TTL_SEC);
        return vec;
    }
    async embedBatch(inputs) {
        if (inputs.length === 0)
            return [];
        return this.embeddings.embedDocuments(inputs);
    }
};
exports.EmbeddingService = EmbeddingService;
exports.EmbeddingService = EmbeddingService = EmbeddingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [app_config_1.AppConfig,
        redis_service_1.RedisService])
], EmbeddingService);
//# sourceMappingURL=embedding.service.js.map