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
exports.ContactsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../shared/prisma/prisma.service");
const bot_service_1 = require("../bot/bot.service");
const types_1 = require("../shared/types");
const zalo_zca_service_1 = require("../channels/zalo/zalo-zca.service");
let ContactsService = class ContactsService {
    prisma;
    bots;
    zca;
    constructor(prisma, bots, zca) {
        this.prisma = prisma;
        this.bots = bots;
        this.zca = zca;
    }
    async getContacts(channel, externalId) {
        const bot = await this.bots.getByExternal(channel, externalId);
        return this.prisma.contact.findMany({
            where: { botId: bot.id },
            orderBy: { name: 'asc' },
        });
    }
    async getFriendRequests(channel, externalId) {
        const bot = await this.bots.getByExternal(channel, externalId);
        return this.prisma.friendRequest.findMany({
            where: { botId: bot.id },
            orderBy: { createdAt: 'desc' },
        });
    }
    async acceptFriendRequest(channel, externalId, requestId) {
        const bot = await this.bots.getByExternal(channel, externalId);
        const request = await this.prisma.friendRequest.findFirst({
            where: { id: requestId, botId: bot.id },
        });
        if (!request) {
            throw new common_1.NotFoundException(`Friend request ${requestId} not found`);
        }
        if (channel === types_1.ChannelType.zalo) {
            await this.zca.acceptFriendRequest(bot.externalId, request.externalId);
        }
        return this.prisma.$transaction(async (tx) => {
            const contact = await tx.contact.create({
                data: {
                    botId: bot.id,
                    externalId: request.externalId,
                    name: request.name,
                    avatar: request.avatar,
                    isFriend: true,
                },
            });
            await tx.friendRequest.delete({
                where: { id: requestId },
            });
            return contact;
        });
    }
    async declineFriendRequest(channel, externalId, requestId) {
        const bot = await this.bots.getByExternal(channel, externalId);
        const request = await this.prisma.friendRequest.findFirst({
            where: { id: requestId, botId: bot.id },
        });
        if (!request) {
            throw new common_1.NotFoundException(`Friend request ${requestId} not found`);
        }
        if (channel === types_1.ChannelType.zalo) {
            await this.zca.rejectFriendRequest(bot.externalId, request.externalId);
        }
        await this.prisma.friendRequest.delete({
            where: { id: requestId },
        });
        return { ok: true };
    }
    async findUser(channel, externalId, phone) {
        if (channel !== types_1.ChannelType.zalo) {
            throw new Error('Search by phone is only supported for Zalo');
        }
        const bot = await this.bots.getByExternal(channel, externalId);
        const result = await this.zca.findUser(bot.externalId, phone);
        if (!result)
            return null;
        const isFriend = await this.prisma.contact.findFirst({
            where: {
                botId: bot.id,
                externalId: result.uid,
                isFriend: true,
            },
        });
        return {
            uid: result.uid,
            zaloName: result.zalo_name,
            displayName: result.display_name,
            avatar: result.avatar || null,
            isFriend: !!isFriend,
        };
    }
    async sendFriendRequest(channel, externalId, targetUserId, message) {
        if (channel !== types_1.ChannelType.zalo) {
            throw new Error('Add friend by ID is only supported for Zalo');
        }
        const bot = await this.bots.getByExternal(channel, externalId);
        const success = await this.zca.sendFriendRequest(bot.externalId, targetUserId, message || 'Xin chào!');
        return { success };
    }
    async getOrCreateConversation(channel, externalId, targetUserId, displayName, avatar) {
        const bot = await this.bots.getByExternal(channel, externalId);
        const conversation = await this.prisma.conversation.upsert({
            where: {
                botId_threadExternalId: {
                    botId: bot.id,
                    threadExternalId: targetUserId,
                },
            },
            create: {
                botId: bot.id,
                threadType: 'user',
                threadExternalId: targetUserId,
                title: displayName,
                avatar: avatar,
            },
            update: {
                title: displayName,
                avatar: avatar,
            },
        });
        await this.prisma.participant.upsert({
            where: {
                conversationId_externalId: {
                    conversationId: conversation.id,
                    externalId: targetUserId,
                },
            },
            create: {
                conversationId: conversation.id,
                externalId: targetUserId,
                displayName: displayName,
                avatar: avatar,
                isBot: false,
            },
            update: {
                displayName: displayName,
                avatar: avatar,
            },
        });
        return conversation;
    }
};
exports.ContactsService = ContactsService;
exports.ContactsService = ContactsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        bot_service_1.BotService,
        zalo_zca_service_1.ZaloZcaService])
], ContactsService);
//# sourceMappingURL=contacts.service.js.map