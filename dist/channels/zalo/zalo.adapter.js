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
var ZaloAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZaloAdapter = void 0;
const common_1 = require("@nestjs/common");
const types_1 = require("../../shared/types");
const zalo_qr_storage_service_1 = require("./zalo-qr-storage.service");
const channel_errors_1 = require("../../shared/errors/channel.errors");
const channel_registry_service_1 = require("../channel-registry.service");
const zalo_instance_registry_1 = require("./zalo-instance.registry");
const zalo_session_service_1 = require("./zalo-session.service");
const zalo_listeners_1 = require("./zalo.listeners");
const prisma_service_1 = require("../../shared/prisma/prisma.service");
const zalo_zca_service_1 = require("./zalo-zca.service");
let ZaloAdapter = ZaloAdapter_1 = class ZaloAdapter {
    registry;
    instances;
    sessions;
    listeners;
    qrStorage;
    prisma;
    zca;
    channel = types_1.ChannelType.zalo;
    logger = new common_1.Logger(ZaloAdapter_1.name);
    constructor(registry, instances, sessions, listeners, qrStorage, prisma, zca) {
        this.registry = registry;
        this.instances = instances;
        this.sessions = sessions;
        this.listeners = listeners;
        this.qrStorage = qrStorage;
        this.prisma = prisma;
        this.zca = zca;
    }
    onModuleInit() {
        this.registry.register(this);
    }
    async startLogin(input) {
        this.qrStorage.ensureExists();
        const qrPath = this.qrStorage.getQrPath();
        this.logger.log(`Zalo QR output path: ${qrPath}`);
        let loginPayload = null;
        let botName = 'Zalo Bot';
        let botAvatar = null;
        try {
            const api = await this.zca.loginQR(qrPath, async (event) => {
                const type = event.type;
                if (type === 0) {
                    this.logger.log(`Zalo QR generated for customer=${input.customerId}`);
                    await event.actions.saveToFile(qrPath);
                    this.logger.log(`Zalo QR saved to file for customer=${input.customerId}: ${qrPath}`);
                    return;
                }
                if (type === 1) {
                    this.logger.warn(`Zalo QR expired for customer=${input.customerId}`);
                    return;
                }
                if (type === 2) {
                    botName = event.data?.display_name || botName;
                    botAvatar = event.data?.avatar || botAvatar;
                    this.logger.log(`Zalo QR scanned by ${botName}`);
                    return;
                }
                if (type === 3) {
                    this.logger.warn(`Zalo QR declined: ${event.data.code}`);
                    return;
                }
                if (type === 4) {
                    loginPayload = {
                        cookie: event.data.cookie,
                        imei: event.data.imei,
                        userAgent: event.data.userAgent,
                    };
                }
            });
            if (!loginPayload) {
                throw new Error('Zalo login completed but session payload was not returned');
            }
            this.logger.log(`Zalo login API resolved for customer=${input.customerId}`);
            const botExternalId = this.zca.getUid(api) ?? String(input.customerId);
            try {
                const profile = await this.zca.getBotProfileByApi(api);
                if (profile) {
                    botName = profile.name;
                    botAvatar = profile.avatar;
                }
            }
            catch (e) {
                this.logger.warn(`Failed to fetch account info: ${e.message}`);
            }
            const bot = await this.prisma.bot.upsert({
                where: {
                    channel_externalId: {
                        channel: types_1.ChannelType.zalo,
                        externalId: botExternalId,
                    },
                },
                create: {
                    customerId: input.customerId,
                    channel: types_1.ChannelType.zalo,
                    externalId: botExternalId,
                    name: botName,
                    avatar: botAvatar,
                    status: 'active',
                },
                update: {
                    customerId: input.customerId,
                    name: botName,
                    avatar: botAvatar,
                    status: 'active',
                },
            });
            await this.sessions.save(bot.id, loginPayload);
            this.instances.set(botExternalId, api);
            this.listeners.attach(botExternalId, bot.id);
            this.logger.log(`Zalo login success and saved for customer=${input.customerId}, botId=${bot.id}`);
            void this.syncFriends(bot.id, botExternalId);
            void this.syncGroups(bot.id, botExternalId);
            return {
                sessionId: String(bot.id),
                hint: { kind: 'none', data: bot }
            };
        }
        catch (err) {
            this.logger.error(`Zalo startLogin failed for customer=${input.customerId}: ${err.message}`);
            throw err;
        }
    }
    async restore(botId) {
        const session = await this.sessions.load(botId);
        if (!session)
            return;
        const api = await this.zca.login({
            cookie: session.cookie,
            imei: session.imei,
            userAgent: session.userAgent,
        });
        const botExternalId = this.zca.getUid(api) ?? String(botId);
        this.instances.set(botExternalId, api);
        this.listeners.attach(botExternalId, botId);
        void this.syncFriends(botId, botExternalId);
        void this.syncGroups(botId, botExternalId);
    }
    async syncFriends(botId, botExternalId) {
        try {
            this.logger.log(`Syncing friends list for botId=${botId} (${botExternalId})`);
            const friends = await this.zca.getAllFriends(botExternalId);
            this.logger.log(`Found ${friends.length} friends for botId=${botId}`);
            for (const friend of friends) {
                await this.prisma.contact.upsert({
                    where: {
                        botId_externalId: {
                            botId,
                            externalId: friend.userId,
                        },
                    },
                    create: {
                        botId,
                        externalId: friend.userId,
                        name: friend.displayName || friend.zaloName || friend.username || 'Zalo Friend',
                        avatar: friend.avatar || null,
                        isFriend: true,
                    },
                    update: {
                        name: friend.displayName || friend.zaloName || friend.username || 'Zalo Friend',
                        avatar: friend.avatar || null,
                        isFriend: true,
                    },
                });
            }
            this.logger.log(`Successfully synced friends list for botId=${botId}`);
            this.logger.log(`Syncing incoming friend requests for botId=${botId}`);
            const requests = await this.zca.getFriendRequests(botExternalId);
            this.logger.log(`Found ${requests.length} incoming requests for botId=${botId}`);
            const existingDbRequests = await this.prisma.friendRequest.findMany({
                where: { botId },
            });
            const activeExternalIds = new Set(requests.map((r) => r.userId));
            const toDelete = existingDbRequests.filter((r) => !activeExternalIds.has(r.externalId));
            if (toDelete.length > 0) {
                await this.prisma.friendRequest.deleteMany({
                    where: {
                        id: { in: toDelete.map((r) => r.id) },
                    },
                });
            }
            for (const req of requests) {
                await this.prisma.friendRequest.upsert({
                    where: {
                        botId_externalId: {
                            botId,
                            externalId: req.userId,
                        },
                    },
                    create: {
                        botId,
                        externalId: req.userId,
                        name: req.displayName,
                        avatar: req.avatar,
                        source: req.message || 'Zalo Request',
                    },
                    update: {
                        name: req.displayName,
                        avatar: req.avatar,
                        source: req.message || 'Zalo Request',
                    },
                });
            }
            this.logger.log(`Successfully synced friend requests for botId=${botId}`);
        }
        catch (error) {
            this.logger.error(`Failed to sync friends/requests for botId=${botId}: ${error.message}`);
        }
    }
    async syncGroups(botId, botExternalId) {
        try {
            this.logger.log(`Syncing groups list for botId=${botId} (${botExternalId})`);
            const groupIds = await this.zca.getAllGroups(botExternalId);
            this.logger.log(`Found ${groupIds.length} groups for botId=${botId}`);
            for (const groupId of groupIds) {
                const groupInfo = await this.zca.getGroupInfo(botExternalId, groupId);
                if (groupInfo) {
                    const conversation = await this.prisma.conversation.upsert({
                        where: {
                            botId_threadExternalId: {
                                botId,
                                threadExternalId: groupId,
                            },
                        },
                        create: {
                            botId,
                            threadType: 'group',
                            threadExternalId: groupId,
                            title: groupInfo.name || 'Zalo Group',
                            avatar: groupInfo.avt || null,
                            lastMessageAt: new Date(0),
                            metadata: {
                                memberCount: groupInfo.totalMember || 0,
                            },
                        },
                        update: {
                            title: groupInfo.name || undefined,
                            avatar: groupInfo.avt || undefined,
                        },
                    });
                    const existingMeta = conversation.metadata || {};
                    await this.prisma.conversation.update({
                        where: { id: conversation.id },
                        data: {
                            metadata: {
                                ...existingMeta,
                                memberCount: groupInfo.totalMember || 0,
                            },
                        },
                    });
                }
            }
            this.logger.log(`Successfully synced groups list for botId=${botId}`);
        }
        catch (error) {
            this.logger.error(`Failed to sync groups for botId=${botId}: ${error.message}`);
        }
    }
    async logout(botId) {
        this.instances.delete(String(botId));
        await this.sessions.clear(botId);
        this.logger.log(`Zalo bot logged out: ${botId}`);
    }
    async send(botExternalId, msg) {
        const threadType = msg.threadType === types_1.ThreadType.group ? 1 : 0;
        try {
            await this.zca.sendMessage(botExternalId, msg.threadId, threadType, msg);
            return { messageExternalId: null, sentAt: Date.now() };
        }
        catch (error) {
            if (error instanceof channel_errors_1.ChannelSendError)
                throw error;
            throw new channel_errors_1.ChannelSendError(`Failed to send Zalo message: ${error.message}`);
        }
    }
    async status(botExternalId) {
        return this.instances.has(botExternalId) ? 'online' : 'offline';
    }
};
exports.ZaloAdapter = ZaloAdapter;
exports.ZaloAdapter = ZaloAdapter = ZaloAdapter_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [channel_registry_service_1.ChannelRegistry,
        zalo_instance_registry_1.ZaloInstanceRegistry,
        zalo_session_service_1.ZaloSessionService,
        zalo_listeners_1.ZaloListeners,
        zalo_qr_storage_service_1.ZaloQrStorageService,
        prisma_service_1.PrismaService,
        zalo_zca_service_1.ZaloZcaService])
], ZaloAdapter);
//# sourceMappingURL=zalo.adapter.js.map