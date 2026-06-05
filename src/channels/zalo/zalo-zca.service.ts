import { Injectable } from '@nestjs/common';
import { ZaloInstanceRegistry } from './zalo-instance.registry';
import { RedisService } from '@/shared/redis/redis.service';

export type ZaloUserProfile = {
  displayName: string | null;
  avatar: string | null;
};

/**
 * Thin wrapper around zca-js calls used by the Zalo channel.
 * Keep all SDK-facing helpers here so the rest of the app does not depend
 * directly on zca-js quirks or call signatures.
 */
@Injectable()
export class ZaloZcaService {
  constructor(
    private readonly instances: ZaloInstanceRegistry,
    private readonly redis: RedisService,
  ) {}

  async getUserProfile(
    botExternalId: string,
    userId: string,
  ): Promise<ZaloUserProfile | null> {
    const cacheKey = `zalo:profile:${userId}`;
    try {
      const cached = await this.redis.cacheGet<ZaloUserProfile>(cacheKey);
      if (cached) return cached;
    } catch {
      // Ignore cache get errors
    }

    const api = this.instances.get(botExternalId) as {
      getUserInfo?: (userId: string) => Promise<unknown>;
    } | undefined;

    if (!api?.getUserInfo) return null;

    try {
      const result = (await api.getUserInfo(userId)) as {
        changed_profiles?: Record<string, {
          displayName?: string;
          zaloName?: string;
          username?: string;
          avatar?: string;
        }>;
        unchanged_profiles?: Record<string, {
          displayName?: string;
          zaloName?: string;
          username?: string;
          avatar?: string;
        }>;
      };

      const profile = result.changed_profiles?.[userId] ?? result.unchanged_profiles?.[userId];
      if (!profile) return null;

      const userProfile: ZaloUserProfile = {
        displayName: profile.displayName || profile.zaloName || profile.username || null,
        avatar: profile.avatar || null,
      };

      try {
        // Cache user profile for 1 day (86400 seconds)
        await this.redis.cacheSet(cacheKey, userProfile, 86400);
      } catch {
        // Ignore cache set errors
      }

      return userProfile;
    } catch {
      return null;
    }
  }

  async loginQR(
    qrPath: string,
    callback: (event: any) => Promise<void>,
  ): Promise<any> {
    const { Zalo } = await import('zca-js');
    const zalo = new Zalo({ selfListen: true, checkUpdate: true, logging: true });
    return zalo.loginQR({ qrPath }, callback);
  }

  async login(session: { cookie: any; imei: string; userAgent: string }): Promise<any> {
    const { Zalo } = await import('zca-js');
    const zalo = new Zalo({ selfListen: true, checkUpdate: false, logging: false });
    return zalo.login({
      cookie: session.cookie,
      imei: session.imei,
      userAgent: session.userAgent,
    });
  }

  async getAllFriends(botExternalId: string): Promise<any[]> {
    const api = this.instances.get(botExternalId) as {
      getAllFriends?: () => Promise<any[]>;
    } | undefined;
    if (typeof api?.getAllFriends !== 'function') return [];
    try {
      return await api.getAllFriends();
    } catch {
      return [];
    }
  }

  async getFriendRequests(botExternalId: string): Promise<any[]> {
    const api = this.instances.get(botExternalId) as {
      getFriendRecommendations?: () => Promise<{ recommItems?: any[] }>;
    } | undefined;
    if (typeof api?.getFriendRecommendations !== 'function') return [];
    try {
      const res = await api.getFriendRecommendations();
      const items = res?.recommItems || [];
      return items
        .filter((item: any) => item?.dataInfo?.recommType === 2) // ReceivedFriendRequest
        .map((item: any) => {
          const info = item.dataInfo;
          return {
            userId: info.userId,
            displayName: info.displayName || info.zaloName || 'Zalo User',
            avatar: info.avatar || null,
            message: info.recommInfo?.message || info.recommInfo?.customText || '',
          };
        });
    } catch {
      return [];
    }
  }

  async acceptFriendRequest(botExternalId: string, friendId: string): Promise<any> {
    const api = this.instances.get(botExternalId) as {
      acceptFriendRequest?: (friendId: string) => Promise<any>;
    } | undefined;
    if (typeof api?.acceptFriendRequest !== 'function') return null;
    return api.acceptFriendRequest(friendId);
  }

  async rejectFriendRequest(botExternalId: string, friendId: string): Promise<any> {
    const api = this.instances.get(botExternalId) as {
      rejectFriendRequest?: (friendId: string) => Promise<any>;
    } | undefined;
    if (typeof api?.rejectFriendRequest !== 'function') return null;
    return api.rejectFriendRequest(friendId);
  }

  async findUser(botExternalId: string, phone: string): Promise<any | null> {
    const api = this.instances.get(botExternalId) as {
      findUser?: (phone: string) => Promise<any>;
    } | undefined;
    if (typeof api?.findUser !== 'function') return null;
    try {
      return await api.findUser(phone);
    } catch {
      return null;
    }
  }

  async sendFriendRequest(botExternalId: string, userId: string, message: string): Promise<boolean> {
    const api = this.instances.get(botExternalId) as {
      sendFriendRequest?: (msg: string, userId: string) => Promise<unknown>;
    } | undefined;
    if (typeof api?.sendFriendRequest !== 'function') return false;
    try {
      await api.sendFriendRequest(message, userId);
      return true;
    } catch {
      return false;
    }
  }

  getUid(api: unknown): string | null {
    const apiAny = api as any;
    const context = typeof apiAny?.getContext === 'function' ? apiAny.getContext() : null;
    return context?.uid ? String(context.uid) : null;
  }

  async getBotProfileByApi(api: unknown): Promise<{ name: string; avatar: string | null } | null> {
    const apiAny = api as any;
    if (typeof apiAny?.fetchAccountInfo !== 'function') return null;
    try {
      const infoBot = await apiAny.fetchAccountInfo();
      const profile = infoBot?.profile;
      if (!profile) return null;
      return {
        name: profile.zaloName || profile.displayName || profile.username || 'Zalo Bot',
        avatar: profile.avatar || null,
      };
    } catch {
      return null;
    }
  }

  async sendMessage(
    botExternalId: string,
    threadId: string,
    threadType: number,
    msg: { type: string; text?: string; attachments?: Array<{ url: string; caption?: string }> },
  ): Promise<any> {
    const api = this.instances.get(botExternalId) as {
      sendMessage?: (payload: Record<string, unknown>, threadId: string, type: number) => Promise<unknown>;
    } | undefined;

    if (!api) {
      throw new Error(`Zalo API instance not found for bot: ${botExternalId}`);
    }

    if (msg.type === 'chat') {
      if (!msg.text?.trim()) {
        throw new Error('Text is required for chat messages');
      }
      return api.sendMessage?.({ msg: msg.text }, threadId, threadType);
    } else if (msg.type === 'image') {
      if (!msg.attachments?.length) {
        throw new Error('Image attachment is required for image messages');
      }
      const [first] = msg.attachments;
      return api.sendMessage?.(
        {
          msg: first.caption ?? msg.text ?? '',
          attachments: [{ data: first.url }],
        },
        threadId,
        threadType,
      );
    } else {
      throw new Error(`Unsupported outbound message type: ${msg.type}`);
    }
  }

  attachListeners(
    botExternalId: string,
    callbacks: {
      onMessage: (message: any) => Promise<void> | void;
      onClosed: (code: any) => Promise<void> | void;
      onFriendEvent?: (event: any) => Promise<void> | void;
    },
  ): void {
    const api = this.instances.get(botExternalId) as {
      listener?: {
        start?: () => void;
        on?: (event: string, handler: (...args: unknown[]) => void) => void;
      };
    } | undefined;

    if (!api?.listener) return;

    api.listener.start?.();
    api.listener.on?.('message', (message: unknown) => {
      void callbacks.onMessage(message);
    });
    api.listener.on?.('closed', (code: unknown) => {
      void callbacks.onClosed(code);
    });
    api.listener.on?.('friend_event', (event: unknown) => {
      if (callbacks.onFriendEvent) {
        void callbacks.onFriendEvent(event);
      }
    });
  }
}
