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
var ZaloListeners_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZaloListeners = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const client_1 = require("@prisma/client");
const messaging_publisher_1 = require("../../messaging/messaging.publisher");
const prisma_service_1 = require("../../shared/prisma/prisma.service");
const domain_events_1 = require("../../shared/events/domain-events");
const zalo_normalizer_1 = require("./zalo.normalizer");
const zalo_instance_registry_1 = require("./zalo-instance.registry");
const zalo_zca_service_1 = require("./zalo-zca.service");
let ZaloListeners = ZaloListeners_1 = class ZaloListeners {
    normalizer;
    publisher;
    instances;
    prisma;
    zca;
    eventEmitter;
    logger = new common_1.Logger(ZaloListeners_1.name);
    constructor(normalizer, publisher, instances, prisma, zca, eventEmitter) {
        this.normalizer = normalizer;
        this.publisher = publisher;
        this.instances = instances;
        this.prisma = prisma;
        this.zca = zca;
        this.eventEmitter = eventEmitter;
    }
    attach(botExternalId, botId) {
        this.zca.attachListeners(botExternalId, {
            onMessage: async (message) => {
                const raw = message;
                await this.dispatchMessage(botExternalId, raw);
            },
            onClosed: async (code) => {
                if (code === 3003)
                    await this.handleClosed3003(botExternalId);
            },
            onFriendEvent: async (event) => {
                await this.handleFriendEvent(botId, botExternalId, event);
            },
            onReaction: async (reaction) => {
                await this.handleReaction(botId, botExternalId, reaction);
            },
        });
        this.logger.log(`Attached Zalo listeners for bot=${botId} uid=${botExternalId}`);
    }
    async dispatchMessage(botExternalId, raw) {
        const inbound = this.normalizer.normalizeMessage({ botExternalId, raw });
        await this.publisher.publishInbound(inbound);
    }
    async handleClosed3003(botExternalId) {
        this.instances.delete(botExternalId);
        await this.prisma.bot.updateMany({
            where: {
                channel: 'zalo',
                externalId: botExternalId,
            },
            data: {
                status: client_1.BotStatus.expired,
            },
        });
        this.logger.warn(`Zalo cookie expired for uid=${botExternalId}`);
    }
    async handleFriendEvent(botId, botExternalId, event) {
        this.logger.log(`Received Zalo friend_event: type=${event.type} for botId=${botId}`);
        try {
            const type = event.type;
            if (type === 0) {
                const friendUid = event.data;
                this.logger.log(`Friend added: ${friendUid}`);
                const profile = await this.zca.getUserProfile(botExternalId, friendUid);
                await this.prisma.contact.upsert({
                    where: {
                        botId_externalId: { botId, externalId: friendUid },
                    },
                    create: {
                        botId,
                        externalId: friendUid,
                        name: profile?.displayName || 'Zalo Friend',
                        avatar: profile?.avatar || null,
                        isFriend: true,
                    },
                    update: {
                        name: profile?.displayName || undefined,
                        avatar: profile?.avatar || undefined,
                        isFriend: true,
                    },
                });
            }
            else if (type === 1) {
                const friendUid = event.data;
                this.logger.log(`Friend removed: ${friendUid}`);
                await this.prisma.contact.updateMany({
                    where: { botId, externalId: friendUid },
                    data: { isFriend: false },
                });
            }
            else if (type === 2) {
                const reqData = event.data;
                const senderUid = reqData.fromUid;
                this.logger.log(`Friend request received from: ${senderUid}`);
                const profile = await this.zca.getUserProfile(botExternalId, senderUid);
                await this.prisma.friendRequest.upsert({
                    where: {
                        botId_externalId: { botId, externalId: senderUid },
                    },
                    create: {
                        botId,
                        externalId: senderUid,
                        name: profile?.displayName || 'Unknown User',
                        avatar: profile?.avatar || null,
                        source: 'Zalo Request',
                    },
                    update: {
                        name: profile?.displayName || undefined,
                        avatar: profile?.avatar || undefined,
                    },
                });
            }
            else if (type === 3 || type === 4) {
                const reqData = event.data;
                const senderUid = reqData.fromUid;
                this.logger.log(`Friend request cancelled/declined for: ${senderUid}`);
                await this.prisma.friendRequest.deleteMany({
                    where: { botId, externalId: senderUid },
                });
            }
        }
        catch (error) {
            this.logger.error(`Error handling friend_event for botId=${botId}: ${error.message}`);
        }
    }
    async handleReaction(botId, botExternalId, event) {
        this.logger.log(`Received Zalo reaction_event: msgId=${event?.data?.content?.rMsg?.[0]?.gMsgID} for botId=${botId}`);
        try {
            const gMsg = event?.data?.content?.rMsg?.[0];
            const messageExternalId = gMsg?.gMsgID ? String(gMsg.gMsgID) : null;
            if (!messageExternalId)
                return;
            const threadId = event?.threadId;
            if (!threadId)
                return;
            const uidFrom = event?.data?.uidFrom;
            const rIcon = event?.data?.content?.rIcon;
            const dName = event?.data?.dName || 'User';
            const bot = await this.prisma.bot.findUnique({
                where: { id: botId },
                select: { customerId: true },
            });
            if (!bot)
                return;
            const conversation = await this.prisma.conversation.findFirst({
                where: { botId, threadExternalId: String(threadId) },
                select: { id: true },
            });
            if (!conversation)
                return;
            const message = await this.prisma.message.findUnique({
                where: {
                    conversationId_messageExternalId: {
                        conversationId: conversation.id,
                        messageExternalId,
                    },
                },
            });
            if (!message)
                return;
            let reactionsList = [];
            if (message.reactions && typeof message.reactions === 'string') {
                try {
                    reactionsList = JSON.parse(message.reactions);
                }
                catch { }
            }
            else if (Array.isArray(message.reactions)) {
                reactionsList = message.reactions;
            }
            reactionsList = reactionsList.filter((r) => r.userId !== String(uidFrom));
            const EMOJI_MAP = {
                '/-heart': '❤️',
                '/-strong': '👍',
                ':>': '😂',
                ':o': '😮',
                ':-((': '😢',
                ':-h': '😡',
            };
            if (rIcon && rIcon !== '') {
                const emoji = EMOJI_MAP[rIcon] || rIcon;
                reactionsList.push({
                    userId: String(uidFrom),
                    userName: dName,
                    reaction: emoji,
                });
            }
            await this.prisma.message.update({
                where: { id: message.id },
                data: { reactions: reactionsList },
            });
            this.eventEmitter.emit(domain_events_1.DOMAIN_EVENTS.MessageReacted, {
                customerId: bot.customerId,
                conversationId: conversation.id,
                messageExternalId,
                reactions: reactionsList,
            });
        }
        catch (error) {
            this.logger.error(`Error handling reaction_event for botId=${botId}: ${error.message}`);
        }
    }
};
exports.ZaloListeners = ZaloListeners;
exports.ZaloListeners = ZaloListeners = ZaloListeners_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [zalo_normalizer_1.ZaloNormalizer,
        messaging_publisher_1.MessagingPublisher,
        zalo_instance_registry_1.ZaloInstanceRegistry,
        prisma_service_1.PrismaService,
        zalo_zca_service_1.ZaloZcaService,
        event_emitter_1.EventEmitter2])
], ZaloListeners);
//# sourceMappingURL=zalo.listeners.js.map