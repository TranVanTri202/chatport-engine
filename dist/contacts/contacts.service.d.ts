import { PrismaService } from '@/shared/prisma/prisma.service';
import { BotService } from '@/bot/bot.service';
import { ChannelType } from '@/shared/types';
import { Contact, FriendRequest } from '@prisma/client';
import { ZaloZcaService } from '@/channels/zalo/zalo-zca.service';
export declare class ContactsService {
    private readonly prisma;
    private readonly bots;
    private readonly zca;
    constructor(prisma: PrismaService, bots: BotService, zca: ZaloZcaService);
    getContacts(channel: ChannelType, externalId: string): Promise<Contact[]>;
    getFriendRequests(channel: ChannelType, externalId: string): Promise<FriendRequest[]>;
    acceptFriendRequest(channel: ChannelType, externalId: string, requestId: number): Promise<Contact>;
    declineFriendRequest(channel: ChannelType, externalId: string, requestId: number): Promise<{
        ok: boolean;
    }>;
    findUser(channel: ChannelType, externalId: string, phone: string): Promise<{
        uid: any;
        zaloName: any;
        displayName: any;
        avatar: any;
        isFriend: boolean;
    } | null>;
    sendFriendRequest(channel: ChannelType, externalId: string, targetUserId: string, message: string): Promise<{
        success: boolean;
    }>;
    getOrCreateConversation(channel: ChannelType, externalId: string, targetUserId: string, displayName: string, avatar: string | null): Promise<{
        id: number;
        avatar: string | null;
        autoReplyEnabled: boolean;
        lastMessageAt: Date | null;
        botId: number;
        threadType: import("@prisma/client").$Enums.ThreadType;
        threadExternalId: string;
        title: string | null;
        unread: number;
        lastMessageText: string | null;
        lastMessageSenderId: string | null;
        lastMessageSenderName: string | null;
        lastMessageSenderAvatar: string | null;
        lastMessageDirection: import("@prisma/client").$Enums.MessageDirection | null;
        metadata: import("@prisma/client/runtime/library").JsonValue;
    }>;
}
