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
exports.BotService = void 0;
const common_1 = require("@nestjs/common");
const quota_service_1 = require("../quota/quota.service");
const bot_repository_1 = require("./repositories/bot.repository");
let BotService = class BotService {
    repo;
    quota;
    constructor(repo, quota) {
        this.repo = repo;
        this.quota = quota;
    }
    list(customerId) {
        return this.repo.findManyByCustomer(customerId);
    }
    async get(id) {
        const bot = await this.repo.findById(id);
        if (!bot)
            throw new common_1.NotFoundException(`Bot ${id} not found`);
        return bot;
    }
    async getDetailed(id) {
        const row = await this.repo.findByIdDetailed(id);
        if (!row)
            throw new common_1.NotFoundException(`Bot ${id} not found`);
        const quota = await this.quota.summary(id);
        const { _count, conversations, ...bot } = row;
        return {
            bot: bot,
            counts: {
                conversations: _count.conversations,
                documents: _count.documents,
            },
            quota,
            lastMessageAt: conversations[0]?.lastMessageAt ?? null,
        };
    }
    async getByExternal(channel, externalId) {
        const bot = await this.repo.findByExternal(channel, externalId);
        if (!bot)
            throw new common_1.NotFoundException(`Bot ${channel}:${externalId} not found`);
        return bot;
    }
    getSystemPrompt(channel, externalId) {
        return this.getByExternal(channel, externalId).then((bot) => bot.systemPrompt ?? null);
    }
    async updateSystemPrompt(channel, externalId, systemPrompt) {
        const bot = await this.getByExternal(channel, externalId);
        return this.repo.update(bot.id, { systemPrompt });
    }
    create(dto) {
        const { settings, temperature, ...rest } = dto;
        const data = {
            ...rest,
            temperature: temperature ?? 0.5,
            ...this.mapSettings(settings),
        };
        return this.repo.create(data);
    }
    async update(id, dto) {
        await this.get(id);
        const { settings, temperature, ...rest } = dto;
        return this.repo.update(id, {
            ...rest,
            ...(temperature !== undefined ? { temperature } : {}),
            ...this.mapSettings(settings),
        });
    }
    async delete(id) {
        await this.repo.delete(id);
    }
    async attachDocuments(channel, externalId, dto) {
        const bot = await this.getByExternal(channel, externalId);
        await this.quota.assertCanAttachDocuments(bot.id, dto.documentIds);
        await this.repo.attachDocuments(bot.id, dto.documentIds);
    }
    mapSettings(s) {
        if (!s)
            return {};
        const out = {};
        if (s.llmModel !== undefined)
            out.llmModel = s.llmModel;
        if (s.temperature !== undefined)
            out.temperature = s.temperature;
        if (s.maxTokens !== undefined)
            out.maxTokens = s.maxTokens;
        if (s.topP !== undefined)
            out.topP = s.topP;
        if (s.frequencyPenalty !== undefined)
            out.frequencyPenalty = s.frequencyPenalty;
        if (s.presencePenalty !== undefined)
            out.presencePenalty = s.presencePenalty;
        if (s.ragTopK !== undefined)
            out.ragTopK = s.ragTopK;
        if (s.extra !== undefined)
            out.settings = s.extra;
        return out;
    }
};
exports.BotService = BotService;
exports.BotService = BotService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => quota_service_1.QuotaService))),
    __metadata("design:paramtypes", [bot_repository_1.BotRepository,
        quota_service_1.QuotaService])
], BotService);
//# sourceMappingURL=bot.service.js.map