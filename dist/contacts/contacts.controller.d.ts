import { ContactsService } from './contacts.service';
import { ChannelType } from '@/shared/types';
export declare class ContactsController {
    private readonly contacts;
    constructor(contacts: ContactsService);
    getContacts(channel: ChannelType, externalId: string): Promise<{
        id: number;
        externalId: string;
        name: string;
        avatar: string | null;
        createdAt: Date;
        updatedAt: Date;
        isFriend: boolean;
        botId: number;
        phone: string | null;
        nickName: string | null;
        isOnline: boolean;
    }[]>;
    getFriendRequests(channel: ChannelType, externalId: string): Promise<{
        id: number;
        externalId: string;
        name: string;
        avatar: string | null;
        createdAt: Date;
        botId: number;
        source: string | null;
    }[]>;
    accept(channel: ChannelType, externalId: string, requestId: number): Promise<{
        id: number;
        externalId: string;
        name: string;
        avatar: string | null;
        createdAt: Date;
        updatedAt: Date;
        isFriend: boolean;
        botId: number;
        phone: string | null;
        nickName: string | null;
        isOnline: boolean;
    }>;
    decline(channel: ChannelType, externalId: string, requestId: number): Promise<{
        ok: boolean;
    }>;
    findUser(channel: ChannelType, externalId: string, phone: string): Promise<{
        uid: any;
        zaloName: any;
        displayName: any;
        avatar: any;
        isFriend: boolean;
    } | null>;
    sendFriendRequest(channel: ChannelType, externalId: string, body: {
        userId: string;
        message?: string;
    }): Promise<{
        success: boolean;
    }>;
    getOrCreateConversation(channel: ChannelType, externalId: string, body: {
        userId: string;
        displayName: string;
        avatar?: string;
    }): Promise<{
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
