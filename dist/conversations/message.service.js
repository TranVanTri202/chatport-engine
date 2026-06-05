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
exports.MessageService = void 0;
const common_1 = require("@nestjs/common");
const message_repository_1 = require("./repositories/message.repository");
const prisma_service_1 = require("../shared/prisma/prisma.service");
const zalo_zca_service_1 = require("../channels/zalo/zalo-zca.service");
const zalo_normalizer_1 = require("../channels/zalo/zalo.normalizer");
const DEFAULT_HISTORY_LIMIT = 20;
let MessageService = class MessageService {
    repo;
    prisma;
    zaloZcaService;
    zaloNormalizer;
    constructor(repo, prisma, zaloZcaService, zaloNormalizer) {
        this.repo = repo;
        this.prisma = prisma;
        this.zaloZcaService = zaloZcaService;
        this.zaloNormalizer = zaloNormalizer;
    }
    async persistInbound(input) {
        const { conversationId, direction, msg } = input;
        return this.repo.upsertInbound({
            conversationId,
            direction,
            senderExternalId: msg.senderExternalId,
            messageExternalId: msg.messageExternalId,
            type: this.resolveMessageType(msg),
            text: msg.text ?? null,
            attachments: msg.attachments,
            quoteOfExternalId: msg.quote?.messageExternalId ?? null,
        });
    }
    async persistOutbound(input) {
        return this.repo.createOutbound({
            conversationId: input.conversationId,
            direction: input.direction,
            senderExternalId: input.senderExternalId,
            messageExternalId: input.messageExternalId,
            text: input.text ?? null,
            attachments: input.attachments,
        });
    }
    resolveMessageType(msg) {
        if (msg.attachments.length === 0)
            return 'chat';
        const types = new Set(msg.attachments.map((a) => a.type));
        if (types.has('image'))
            return 'image';
        if (types.has('video'))
            return 'video';
        if (types.has('file'))
            return 'file';
        if (types.has('voice'))
            return 'voice';
        if (types.has('sticker'))
            return 'sticker';
        if (types.has('link'))
            return 'link';
        return 'unknown';
    }
    async lastN(conversationId, limit = 10) {
        const rows = await this.repo.findLastN(conversationId, limit);
        return rows.reverse();
    }
    async listByConversation(input) {
        const take = input.limit ?? DEFAULT_HISTORY_LIMIT;
        const cursorBigInt = input.cursor ? BigInt(input.cursor) : undefined;
        let rows = cursorBigInt !== undefined
            ? await this.repo.findManyPagedWithCursor(input.conversationId, take + 1, cursorBigInt)
            : await this.repo.findManyPaged(input.conversationId, take + 1);
        if (rows.length === 0 && cursorBigInt === undefined) {
            try {
                const convo = await this.prisma.conversation.findUnique({
                    where: { id: input.conversationId },
                    include: { bot: true },
                });
                console.log(`[HistorySync] Checking convo ID=${input.conversationId}, threadType=${convo?.threadType}, channel=${convo?.bot.channel}`);
                if (convo && convo.threadType === 'group' && convo.bot.channel === 'zalo') {
                    console.log(`[HistorySync] Fetching Zalo history for bot=${convo.bot.externalId}, thread=${convo.threadExternalId}`);
                    const history = await this.zaloZcaService.getGroupChatHistory(convo.bot.externalId, convo.threadExternalId, 30);
                    console.log(`[HistorySync] Zalo history response:`, JSON.stringify(history));
                    if (history && history.groupMsgs && history.groupMsgs.length > 0) {
                        console.log(`[HistorySync] Found ${history.groupMsgs.length} messages to sync`);
                        for (const rawMsg of history.groupMsgs) {
                            const inbound = this.zaloNormalizer.normalizeMessage({
                                botExternalId: convo.bot.externalId,
                                raw: rawMsg,
                            });
                            const direction = inbound.isSelf ? 'out' : 'in';
                            await this.repo.upsertInbound({
                                conversationId: convo.id,
                                direction,
                                senderExternalId: inbound.senderExternalId,
                                messageExternalId: inbound.messageExternalId,
                                type: this.resolveMessageType({
                                    attachments: inbound.attachments,
                                }),
                                text: inbound.text ?? null,
                                attachments: inbound.attachments,
                                quoteOfExternalId: inbound.quote?.messageExternalId ?? null,
                            });
                        }
                        rows = await this.repo.findManyPaged(input.conversationId, take + 1);
                        console.log(`[HistorySync] Successfully synced history, new DB row count: ${rows.length}`);
                    }
                    else {
                        console.log(`[HistorySync] Zalo history returned no messages`);
                    }
                }
            }
            catch (err) {
                console.error('[HistorySync] Failed to sync group chat history:', err);
            }
        }
        const hasMore = rows.length > take;
        const items = hasMore ? rows.slice(0, take) : rows;
        return {
            items,
            nextCursor: hasMore ? items[items.length - 1].id.toString() : null,
        };
    }
};
exports.MessageService = MessageService;
exports.MessageService = MessageService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [message_repository_1.MessageRepository,
        prisma_service_1.PrismaService,
        zalo_zca_service_1.ZaloZcaService,
        zalo_normalizer_1.ZaloNormalizer])
], MessageService);
//# sourceMappingURL=message.service.js.map