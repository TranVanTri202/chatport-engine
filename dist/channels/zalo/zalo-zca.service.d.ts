import { ZaloInstanceRegistry } from './zalo-instance.registry';
import { RedisService } from '@/shared/redis/redis.service';
export type ZaloUserProfile = {
    displayName: string | null;
    avatar: string | null;
};
export declare class ZaloZcaService {
    private readonly instances;
    private readonly redis;
    constructor(instances: ZaloInstanceRegistry, redis: RedisService);
    getUserProfile(botExternalId: string, userId: string): Promise<ZaloUserProfile | null>;
    loginQR(qrPath: string, callback: (event: any) => Promise<void>): Promise<any>;
    login(session: {
        cookie: any;
        imei: string;
        userAgent: string;
    }): Promise<any>;
    getAllFriends(botExternalId: string): Promise<any[]>;
    getFriendRequests(botExternalId: string): Promise<any[]>;
    acceptFriendRequest(botExternalId: string, friendId: string): Promise<any>;
    rejectFriendRequest(botExternalId: string, friendId: string): Promise<any>;
    findUser(botExternalId: string, phone: string): Promise<any | null>;
    sendFriendRequest(botExternalId: string, userId: string, message: string): Promise<boolean>;
    getUid(api: unknown): string | null;
    getBotProfileByApi(api: unknown): Promise<{
        name: string;
        avatar: string | null;
    } | null>;
    sendMessage(botExternalId: string, threadId: string, threadType: number, msg: {
        type: string;
        text?: string;
        attachments?: Array<{
            url: string;
            caption?: string;
        }>;
    }): Promise<any>;
    attachListeners(botExternalId: string, callbacks: {
        onMessage: (message: any) => Promise<void> | void;
        onClosed: (code: any) => Promise<void> | void;
        onFriendEvent?: (event: any) => Promise<void> | void;
        onReaction?: (reaction: any) => Promise<void> | void;
    }): void;
    getGroupInfo(botExternalId: string, groupId: string): Promise<any | null>;
    getAllGroups(botExternalId: string): Promise<string[]>;
    getGroupChatHistory(botExternalId: string, groupId: string, count?: number): Promise<any | null>;
    addReaction(botExternalId: string, threadId: string, threadType: number, messageExternalId: string, reactIcon: string): Promise<any>;
}
