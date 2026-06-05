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
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuotaService = void 0;
const common_1 = require("@nestjs/common");
const bot_repository_1 = require("../bot/repositories/bot.repository");
const prisma_service_1 = require("../shared/prisma/prisma.service");
const quota_errors_1 = require("../shared/errors/quota.errors");
let QuotaService = class QuotaService {
    bots;
    prisma;
    constructor(bots, prisma) {
        this.bots = bots;
        this.prisma = prisma;
    }
    async consumeRequest(botId) {
        const updated = await this.bots.tryConsumeRequest(botId);
        if (updated)
            return;
        const bot = await this.bots.findById(botId);
        if (!bot)
            throw new common_1.NotFoundException(`Bot ${botId} not found`);
        throw new quota_errors_1.QuotaExceededError('request', botId, bot.requestUsed, bot.requestQuota);
    }
    async refundRequest(botId) {
        await this.bots.refundRequest(botId);
    }
    async assertCanAttachDocuments(botId, newDocIds) {
        if (newDocIds.length === 0)
            return;
        const bot = await this.bots.findById(botId);
        if (!bot)
            throw new common_1.NotFoundException(`Bot ${botId} not found`);
        const existing = await this.prisma.document.findMany({
            where: { botId, id: { in: newDocIds } },
            select: { id: true },
        });
        const existingSet = new Set(existing.map((e) => e.id));
        const trulyNew = newDocIds.filter((id) => !existingSet.has(id));
        if (trulyNew.length === 0)
            return;
        const currentCount = await this.bots.listDocuments(botId).then((docs) => docs.length);
        const projected = currentCount + trulyNew.length;
        if (projected > bot.documentQuota) {
            throw new quota_errors_1.QuotaExceededError('document', botId, currentCount, bot.documentQuota);
        }
    }
    async summary(botId) {
        const bot = await this.bots.findById(botId);
        if (!bot)
            throw new common_1.NotFoundException(`Bot ${botId} not found`);
        const docCount = await this.bots.listDocuments(botId).then((docs) => docs.length);
        return {
            request: {
                used: bot.requestUsed,
                limit: bot.requestQuota,
                remaining: Math.max(0, bot.requestQuota - bot.requestUsed),
            },
            document: {
                used: docCount,
                limit: bot.documentQuota,
                remaining: Math.max(0, bot.documentQuota - docCount),
            },
        };
    }
};
exports.QuotaService = QuotaService;
exports.QuotaService = QuotaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [bot_repository_1.BotRepository,
        prisma_service_1.PrismaService])
], QuotaService);
//# sourceMappingURL=quota.service.js.map