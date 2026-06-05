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
exports.MessageRepository = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/prisma/prisma.service");
let MessageRepository = class MessageRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async upsertInbound(input) {
        return this.prisma.message.upsert({
            where: {
                conversationId_messageExternalId: {
                    conversationId: input.conversationId,
                    messageExternalId: input.messageExternalId,
                },
            },
            create: {
                conversationId: input.conversationId,
                direction: input.direction,
                senderExternalId: input.senderExternalId,
                messageExternalId: input.messageExternalId,
                type: input.type,
                text: input.text,
                attachments: input.attachments,
                quoteOfExternalId: input.quoteOfExternalId,
            },
            update: {},
        });
    }
    async createOutbound(data) {
        return this.prisma.message.create({ data });
    }
    async findLastN(conversationId, limit) {
        return this.prisma.message.findMany({
            where: { conversationId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }
    async findManyPaged(conversationId, limit) {
        return this.prisma.message.findMany({
            where: { conversationId },
            orderBy: { id: 'desc' },
            take: limit,
        });
    }
    async findManyPagedWithCursor(conversationId, limit, cursor) {
        return this.prisma.message.findMany({
            where: { conversationId },
            orderBy: { id: 'desc' },
            take: limit,
            cursor: { id: cursor },
            skip: 1,
        });
    }
};
exports.MessageRepository = MessageRepository;
exports.MessageRepository = MessageRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MessageRepository);
//# sourceMappingURL=message.repository.js.map