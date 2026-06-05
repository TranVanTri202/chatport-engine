"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZaloZcaService = void 0;
const common_1 = require("@nestjs/common");
const zalo_instance_registry_1 = require("./zalo-instance.registry");
const redis_service_1 = require("../../shared/redis/redis.service");
const buffer_1 = require("buffer");
let ZaloZcaService = class ZaloZcaService {
    instances;
    redis;
    constructor(instances, redis) {
        this.instances = instances;
        this.redis = redis;
    }
    async getUserProfile(botExternalId, userId) {
        const cacheKey = `zalo:profile:${userId}`;
        try {
            const cached = await this.redis.cacheGet(cacheKey);
            if (cached)
                return cached;
        }
        catch {
        }
        const api = this.instances.get(botExternalId);
        if (!api?.getUserInfo)
            return null;
        try {
            const result = (await api.getUserInfo(userId));
            const profile = result.changed_profiles?.[userId] ?? result.unchanged_profiles?.[userId];
            if (!profile)
                return null;
            const userProfile = {
                displayName: profile.displayName || profile.zaloName || profile.username || null,
                avatar: profile.avatar || null,
            };
            try {
                await this.redis.cacheSet(cacheKey, userProfile, 86400);
            }
            catch {
            }
            return userProfile;
        }
        catch {
            return null;
        }
    }
    async loginQR(qrPath, callback) {
        const { Zalo } = await Promise.resolve().then(() => __importStar(require('zca-js')));
        const zalo = new Zalo({ selfListen: true, checkUpdate: true, logging: true });
        return zalo.loginQR({ qrPath }, callback);
    }
    async login(session) {
        const { Zalo } = await Promise.resolve().then(() => __importStar(require('zca-js')));
        const zalo = new Zalo({ selfListen: true, checkUpdate: false, logging: false });
        return zalo.login({
            cookie: session.cookie,
            imei: session.imei,
            userAgent: session.userAgent,
        });
    }
    async getAllFriends(botExternalId) {
        const api = this.instances.get(botExternalId);
        if (typeof api?.getAllFriends !== 'function')
            return [];
        try {
            return await api.getAllFriends();
        }
        catch {
            return [];
        }
    }
    async getFriendRequests(botExternalId) {
        const api = this.instances.get(botExternalId);
        if (typeof api?.getFriendRecommendations !== 'function')
            return [];
        try {
            const res = await api.getFriendRecommendations();
            const items = res?.recommItems || [];
            return items
                .filter((item) => item?.dataInfo?.recommType === 2)
                .map((item) => {
                const info = item.dataInfo;
                return {
                    userId: info.userId,
                    displayName: info.displayName || info.zaloName || 'Zalo User',
                    avatar: info.avatar || null,
                    message: info.recommInfo?.message || info.recommInfo?.customText || '',
                };
            });
        }
        catch {
            return [];
        }
    }
    async acceptFriendRequest(botExternalId, friendId) {
        const api = this.instances.get(botExternalId);
        if (typeof api?.acceptFriendRequest !== 'function')
            return null;
        return api.acceptFriendRequest(friendId);
    }
    async rejectFriendRequest(botExternalId, friendId) {
        const api = this.instances.get(botExternalId);
        if (typeof api?.rejectFriendRequest !== 'function')
            return null;
        return api.rejectFriendRequest(friendId);
    }
    async findUser(botExternalId, phone) {
        const api = this.instances.get(botExternalId);
        if (typeof api?.findUser !== 'function')
            return null;
        try {
            return await api.findUser(phone);
        }
        catch {
            return null;
        }
    }
    async sendFriendRequest(botExternalId, userId, message) {
        const api = this.instances.get(botExternalId);
        if (typeof api?.sendFriendRequest !== 'function')
            return false;
        try {
            await api.sendFriendRequest(message, userId);
            return true;
        }
        catch {
            return false;
        }
    }
    getUid(api) {
        const apiAny = api;
        const context = typeof apiAny?.getContext === 'function' ? apiAny.getContext() : null;
        return context?.uid ? String(context.uid) : null;
    }
    async getBotProfileByApi(api) {
        const apiAny = api;
        if (typeof apiAny?.fetchAccountInfo !== 'function')
            return null;
        try {
            const infoBot = await apiAny.fetchAccountInfo();
            const profile = infoBot?.profile;
            if (!profile)
                return null;
            return {
                name: profile.zaloName || profile.displayName || profile.username || 'Zalo Bot',
                avatar: profile.avatar || null,
            };
        }
        catch {
            return null;
        }
    }
    async sendMessage(botExternalId, threadId, threadType, msg) {
        const api = this.instances.get(botExternalId);
        if (!api) {
            throw new Error(`Zalo API instance not found for bot: ${botExternalId}`);
        }
        if (msg.type === 'chat') {
            if (!msg.text?.trim()) {
                throw new Error('Text is required for chat messages');
            }
            return api.sendMessage?.({ msg: msg.text }, threadId, threadType);
        }
        else if (msg.type === 'image') {
            if (!msg.attachments?.length) {
                throw new Error('Image attachment is required for image messages');
            }
            const [first] = msg.attachments;
            let attachmentSource;
            if (first.url.startsWith('data:')) {
                const match = first.url.match(/^data:([^;]+);name=([^;]+);base64,(.+)$/);
                if (match) {
                    const [, mimeType, encodedName, base64Data] = match;
                    const fileName = decodeURIComponent(encodedName);
                    const buffer = buffer_1.Buffer.from(base64Data, 'base64');
                    attachmentSource = {
                        data: buffer,
                        filename: fileName,
                        metadata: {
                            totalSize: buffer.length,
                        },
                    };
                }
                else {
                    attachmentSource = first.url;
                }
            }
            else {
                attachmentSource = first.url;
            }
            return api.sendMessage?.({
                msg: first.caption ?? msg.text ?? '',
                attachments: attachmentSource,
            }, threadId, threadType);
        }
        else {
            throw new Error(`Unsupported outbound message type: ${msg.type}`);
        }
    }
    attachListeners(botExternalId, callbacks) {
        const api = this.instances.get(botExternalId);
        if (!api?.listener)
            return;
        api.listener.start?.();
        api.listener.on?.('message', (message) => {
            void callbacks.onMessage(message);
        });
        api.listener.on?.('closed', (code) => {
            void callbacks.onClosed(code);
        });
        api.listener.on?.('friend_event', (event) => {
            if (callbacks.onFriendEvent) {
                void callbacks.onFriendEvent(event);
            }
        });
        api.listener.on?.('reaction', (reaction) => {
            if (callbacks.onReaction) {
                void callbacks.onReaction(reaction);
            }
        });
    }
    async getGroupInfo(botExternalId, groupId) {
        const api = this.instances.get(botExternalId);
        if (typeof api?.getGroupInfo !== 'function')
            return null;
        try {
            const res = await api.getGroupInfo(groupId);
            return res?.gridInfoMap?.[groupId] ?? null;
        }
        catch {
            return null;
        }
    }
    async getAllGroups(botExternalId) {
        const api = this.instances.get(botExternalId);
        if (typeof api?.getAllGroups !== 'function')
            return [];
        try {
            const res = await api.getAllGroups();
            return Object.keys(res?.gridVerMap ?? {});
        }
        catch {
            return [];
        }
    }
    async getGroupChatHistory(botExternalId, groupId, count) {
        const api = this.instances.get(botExternalId);
        if (typeof api?.getGroupChatHistory !== 'function')
            return null;
        try {
            return await api.getGroupChatHistory(groupId, count);
        }
        catch {
            return null;
        }
    }
    async addReaction(botExternalId, threadId, threadType, messageExternalId, reactIcon) {
        const api = this.instances.get(botExternalId);
        if (!api || typeof api.addReaction !== 'function') {
            throw new Error(`addReaction not supported by bot: ${botExternalId}`);
        }
        return api.addReaction(reactIcon, {
            data: {
                msgId: messageExternalId,
                cliMsgId: '',
            },
            threadId,
            type: threadType,
        });
    }
};
exports.ZaloZcaService = ZaloZcaService;
exports.ZaloZcaService = ZaloZcaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [zalo_instance_registry_1.ZaloInstanceRegistry,
        redis_service_1.RedisService])
], ZaloZcaService);
//# sourceMappingURL=zalo-zca.service.js.map