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
exports.ConversationService = void 0;
const common_1 = require("@nestjs/common");
const types_1 = require("../shared/types");
const zalo_zca_service_1 = require("../channels/zalo/zalo-zca.service");
const conversation_repository_1 = require("./repositories/conversation.repository");
const DEFAULT_LIST_LIMIT = 30;
let ConversationService = class ConversationService {
    repo;
    zaloZcaService;
    constructor(repo, zaloZcaService) {
        this.repo = repo;
        this.zaloZcaService = zaloZcaService;
    }
    async getBotByExternal(channel, externalId) {
        const bot = await this.repo.findBotByExternal(channel, externalId);
        if (!bot) {
            throw new common_1.NotFoundException(`Bot ${channel}:${externalId} not found`);
        }
        return bot;
    }
    async resolveUserProfile(channel, botExternalId, userId) {
        if (channel !== 'zalo')
            return null;
        const existingParticipant = await this.repo.findParticipantProfile(channel, botExternalId, userId);
        const hasProfile = Boolean(existingParticipant?.displayName || existingParticipant?.avatar);
        if (hasProfile) {
            return existingParticipant;
        }
        const profile = await this.zaloZcaService.getUserProfile(botExternalId, userId);
        if (profile) {
            return profile;
        }
        return existingParticipant ?? null;
    }
    async upsertFromInbound(msg) {
        const bot = await this.getBotByExternal(msg.channel, msg.botExternalId);
        const senderProfile = await this.resolveUserProfile(msg.channel, msg.botExternalId, msg.senderExternalId);
        const lastMessageSenderName = senderProfile?.displayName ?? msg.senderName ?? null;
        const lastMessageSenderAvatar = senderProfile?.avatar ?? null;
        let convoTitle = null;
        let convoAvatar = null;
        let memberCount = undefined;
        if (msg.threadType === 'user') {
            const otherProfile = await this.resolveUserProfile(msg.channel, msg.botExternalId, msg.threadId);
            convoTitle = otherProfile?.displayName ?? (msg.isSelf ? null : msg.senderName) ?? null;
            convoAvatar = otherProfile?.avatar ?? null;
        }
        else if (msg.threadType === 'group') {
            if (msg.channel === types_1.ChannelType.zalo) {
                const groupInfo = await this.zaloZcaService.getGroupInfo(msg.botExternalId, msg.threadId);
                if (groupInfo) {
                    convoTitle = groupInfo.name;
                    convoAvatar = groupInfo.avt;
                    memberCount = groupInfo.totalMember;
                }
            }
        }
        const conversation = await this.repo.upsertConversationFromInbound({
            botId: bot.id,
            threadExternalId: msg.threadId,
            threadType: msg.threadType,
            title: convoTitle,
            avatar: convoAvatar,
            timestamp: new Date(msg.timestamp),
            text: msg.text ?? null,
            senderExternalId: msg.senderExternalId,
            senderName: lastMessageSenderName,
            senderAvatar: lastMessageSenderAvatar,
            isSelf: msg.isSelf,
            memberCount,
        });
        await this.repo.upsertParticipant({
            conversationId: conversation.id,
            externalId: msg.senderExternalId,
            displayName: senderProfile?.displayName ?? msg.senderName ?? null,
            avatar: senderProfile?.avatar ?? null,
            isBot: msg.senderExternalId === bot.externalId,
        });
        return { conversation, bot };
    }
    async getOrCreate(input) {
        return this.repo.getOrCreate(input);
    }
    async getOrCreateBySession(input) {
        return this.getOrCreate({
            botId: input.botId,
            threadType: input.threadType ?? types_1.ThreadType.user,
            threadExternalId: input.sessionId,
        });
    }
    async listForBot(input) {
        const bot = await this.getBotByExternal(input.channel, input.externalId);
        const take = input.limit ?? DEFAULT_LIST_LIMIT;
        const rows = await this.repo.findManyByBot(bot.id, take + 1, input.cursor);
        const hasMore = rows.length > take;
        const items = hasMore ? rows.slice(0, take) : rows;
        return {
            items,
            nextCursor: hasMore ? items[items.length - 1].id : null,
        };
    }
    async getById(id) {
        const c = await this.repo.findById(id);
        if (!c)
            throw new common_1.NotFoundException(`Conversation ${id} not found`);
        return c;
    }
    async listParticipants(input) {
        const take = input.limit ?? 30;
        const rows = await this.repo.findManyParticipants(input.conversationId, take + 1, input.cursor);
        const hasMore = rows.length > take;
        const items = hasMore ? rows.slice(0, take) : rows;
        return {
            items,
            nextCursor: hasMore ? items[items.length - 1].id : null,
        };
    }
    async getSummary(id) {
        const metadata = await this.repo.findMetadata(id);
        if (!metadata || Array.isArray(metadata) || typeof metadata !== 'object')
            return null;
        const summary = metadata.summary;
        return typeof summary === 'string' && summary.trim().length > 0 ? summary.trim() : null;
    }
    async setSummary(id, summary) {
        const metadata = await this.repo.findMetadata(id);
        const nextMetadata = (!metadata || Array.isArray(metadata) || typeof metadata !== 'object')
            ? {}
            : { ...metadata };
        nextMetadata.summary = summary;
        await this.repo.updateMetadata(id, nextMetadata);
    }
    async getContextSnapshot(id) {
        return { summary: await this.getSummary(id) };
    }
    async updateContextSnapshot(id, summary) {
        await this.setSummary(id, summary);
    }
    async markRead(id) {
        await this.repo.updateUnread(id, 0);
    }
    async updateAutoReply(id, autoReplyEnabled) {
        await this.repo.updateAutoReply(id, autoReplyEnabled);
    }
};
exports.ConversationService = ConversationService;
exports.ConversationService = ConversationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [conversation_repository_1.ConversationRepository,
        zalo_zca_service_1.ZaloZcaService])
], ConversationService);
//# sourceMappingURL=conversation.service.js.map