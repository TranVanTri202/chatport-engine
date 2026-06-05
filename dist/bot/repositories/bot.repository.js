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
exports.BotRepository = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/prisma/prisma.service");
let BotRepository = class BotRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    findManyByCustomer(customerId) {
        return this.prisma.bot.findMany({
            where: { customerId },
            include: {
                _count: {
                    select: {
                        friendRequests: true,
                        contacts: { where: { isFriend: true } },
                    },
                },
            },
            orderBy: { id: 'desc' },
        });
    }
    async findByIdDetailed(id) {
        return this.prisma.bot.findUnique({
            where: { id },
            include: {
                _count: { select: { conversations: true, documents: true } },
                conversations: {
                    orderBy: { lastMessageAt: 'desc' },
                    take: 1,
                    select: { lastMessageAt: true },
                },
            },
        });
    }
    findById(id) {
        return this.prisma.bot.findUnique({ where: { id } });
    }
    findByExternal(channel, externalId) {
        return this.prisma.bot.findUnique({
            where: { channel_externalId: { channel, externalId } },
        });
    }
    create(data) {
        return this.prisma.bot.create({ data });
    }
    update(id, data) {
        return this.prisma.bot.update({ where: { id }, data });
    }
    delete(id) {
        return this.prisma.bot.delete({ where: { id } });
    }
    getSystemPrompt(botId) {
        return this.prisma.bot.findUnique({
            where: { id: botId },
            select: { systemPrompt: true },
        }).then((bot) => bot?.systemPrompt ?? null);
    }
    listDocuments(botId) {
        return this.prisma.document.findMany({
            where: { botId },
            orderBy: { id: 'desc' },
        });
    }
    detachDocument(botId, documentId) {
        return this.prisma.document.update({
            where: { id: documentId },
            data: { botId },
        });
    }
    attachDocuments(botId, documentIds) {
        return this.prisma.document.updateMany({
            where: { id: { in: documentIds } },
            data: { botId },
        });
    }
    async tryConsumeRequest(botId) {
        const rows = await this.prisma.$queryRaw `
      UPDATE "Bot"
         SET "requestUsed" = "requestUsed" + 1, "updatedAt" = NOW()
       WHERE id = ${botId}
         AND "requestUsed" < "requestQuota"
       RETURNING id, "requestUsed", "requestQuota"
    `;
        return rows[0] ?? null;
    }
    async refundRequest(botId) {
        await this.prisma.$executeRaw `
      UPDATE "Bot"
         SET "requestUsed" = GREATEST(0, "requestUsed" - 1), "updatedAt" = NOW()
       WHERE id = ${botId}
    `;
    }
    async resetRequestCounter(botId) {
        await this.prisma.bot.update({
            where: { id: botId },
            data: { requestUsed: 0 },
        });
    }
};
exports.BotRepository = BotRepository;
exports.BotRepository = BotRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BotRepository);
//# sourceMappingURL=bot.repository.js.map