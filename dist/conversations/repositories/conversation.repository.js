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
exports.ConversationRepository = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/prisma/prisma.service");
let ConversationRepository = class ConversationRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findBotByExternal(channel, externalId) {
        return this.prisma.bot.findUnique({
            where: { channel_externalId: { channel, externalId } },
        });
    }
    async findParticipantProfile(channel, botExternalId, userId) {
        return this.prisma.participant.findFirst({
            where: {
                externalId: userId,
                conversation: {
                    bot: {
                        channel,
                        externalId: botExternalId,
                    },
                },
            },
            select: {
                displayName: true,
                avatar: true,
            },
        });
    }
    async upsertConversationFromInbound(input) {
        const isSelf = input.isSelf ?? false;
        const isGroup = input.threadType === 'group';
        const existing = await this.prisma.conversation.findUnique({
            where: {
                botId_threadExternalId: {
                    botId: input.botId,
                    threadExternalId: input.threadExternalId,
                },
            },
            select: { metadata: true },
        });
        const existingMeta = existing?.metadata || {};
        const nextMeta = {
            ...existingMeta,
            ...(input.memberCount !== undefined ? { memberCount: input.memberCount } : {}),
        };
        return this.prisma.conversation.upsert({
            where: {
                botId_threadExternalId: {
                    botId: input.botId,
                    threadExternalId: input.threadExternalId,
                },
            },
            create: {
                botId: input.botId,
                threadType: input.threadType,
                threadExternalId: input.threadExternalId,
                title: input.title || (isGroup ? 'Zalo Group' : 'Stranger'),
                avatar: input.avatar,
                lastMessageAt: input.timestamp,
                lastMessageText: input.text,
                lastMessageSenderId: input.senderExternalId,
                lastMessageSenderName: input.senderName,
                lastMessageSenderAvatar: input.senderAvatar,
                lastMessageDirection: isSelf ? 'out' : 'in',
                unread: isSelf ? 0 : 1,
                metadata: nextMeta,
            },
            update: {
                ...(input.avatar && { avatar: input.avatar }),
                ...(input.title && { title: input.title }),
                lastMessageAt: input.timestamp,
                lastMessageText: input.text,
                lastMessageSenderId: input.senderExternalId,
                lastMessageSenderName: input.senderName,
                lastMessageSenderAvatar: input.senderAvatar,
                lastMessageDirection: isSelf ? 'out' : 'in',
                unread: isSelf ? 0 : { increment: 1 },
                metadata: nextMeta,
            },
        });
    }
    async upsertParticipant(input) {
        return this.prisma.participant.upsert({
            where: {
                conversationId_externalId: {
                    conversationId: input.conversationId,
                    externalId: input.externalId,
                },
            },
            create: {
                conversationId: input.conversationId,
                externalId: input.externalId,
                displayName: input.displayName,
                avatar: input.avatar,
                isBot: input.isBot,
            },
            update: {
                ...(input.displayName ? { displayName: input.displayName } : {}),
                ...(input.avatar ? { avatar: input.avatar } : {}),
            },
        });
    }
    async getOrCreate(input) {
        return this.prisma.conversation.upsert({
            where: {
                botId_threadExternalId: {
                    botId: input.botId,
                    threadExternalId: input.threadExternalId,
                },
            },
            create: input,
            update: {},
        });
    }
    async findManyByBot(botId, limit, cursor) {
        return this.prisma.conversation.findMany({
            where: { botId },
            orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
            take: limit,
            ...(cursor !== undefined && {
                cursor: { id: cursor },
                skip: 1,
            }),
        });
    }
    async findById(id) {
        return this.prisma.conversation.findUnique({
            where: { id },
            include: {
                participants: {
                    orderBy: [{ isBot: 'asc' }, { id: 'asc' }],
                },
            },
        });
    }
    async findManyParticipants(conversationId, limit, cursor) {
        return this.prisma.participant.findMany({
            where: { conversationId },
            orderBy: [{ isBot: 'asc' }, { id: 'asc' }],
            take: limit,
            ...(cursor !== undefined && {
                cursor: { id: cursor },
                skip: 1,
            }),
        });
    }
    async findMetadata(id) {
        const res = await this.prisma.conversation.findUnique({
            where: { id },
            select: { metadata: true },
        });
        return res?.metadata ?? null;
    }
    async updateMetadata(id, metadata) {
        return this.prisma.conversation.update({
            where: { id },
            data: { metadata },
        });
    }
    async updateUnread(id, unread) {
        return this.prisma.conversation.update({
            where: { id },
            data: { unread },
        });
    }
    async updateAutoReply(id, autoReplyEnabled) {
        return this.prisma.conversation.update({
            where: { id },
            data: { autoReplyEnabled },
        });
    }
};
exports.ConversationRepository = ConversationRepository;
exports.ConversationRepository = ConversationRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ConversationRepository);
//# sourceMappingURL=conversation.repository.js.map