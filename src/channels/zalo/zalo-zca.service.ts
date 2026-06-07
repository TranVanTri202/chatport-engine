import { Injectable } from '@nestjs/common';
import { ZaloInstanceRegistry } from './zalo-instance.registry';
import { RedisService } from '@/shared/redis/redis.service';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { Buffer } from 'buffer';

export type ZaloUserProfile = {
  displayName: string | null;
  avatar: string | null;
};

/**
 * Thin wrapper around zca-js calls used by the Zalo channel.
 * Keep all SDK-facing helpers here so the rest of the app does not depend
 * directly on zca-js quirks or call signatures.
 */
export type ZaloLastOnlineResponse = {
  readonly online: boolean;
  readonly lastOnline: number | null;
  readonly presenceText: string;
};

@Injectable()
export class ZaloZcaService {
  private readonly lastOnlineInflight = new Map<string, Promise<ZaloLastOnlineResponse | null>>();

  constructor(
    private readonly instances: ZaloInstanceRegistry,
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  private formatPresenceText(lastOnline: number | null): string {
    if (!lastOnline) return 'Ngoại tuyến';
    const diffMs = Date.now() - lastOnline;
    if (diffMs < 60_000) return 'Vừa xong';
    const minutes = Math.floor(diffMs / 60_000);
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
  }

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

  async getLastOnline(botExternalId: string, uid: string): Promise<ZaloLastOnlineResponse | null> {
    const cacheKey = `zalo:last-online:${botExternalId}:${uid}`;
    try {
      const cached = await this.redis.cacheGet<ZaloLastOnlineResponse>(cacheKey);
      if (cached) return cached;
    } catch {
      // ignore cache read failures
    }

    const inflightKey = `${botExternalId}:${uid}`;
    const inflight = this.lastOnlineInflight.get(inflightKey);
    if (inflight) return inflight;

    const promise = (async (): Promise<ZaloLastOnlineResponse | null> => {
      const api = this.instances.get(botExternalId) as {
        lastOnline?: (uid: string) => Promise<{ settings?: { show_online_status?: boolean }; lastOnline?: number }>;
      } | undefined;

      if (typeof api?.lastOnline !== 'function') return null;

      try {
        const res = await api.lastOnline(uid);
        const showOnlineSetting = Boolean(res?.settings?.show_online_status);
        const lastOnline = typeof res?.lastOnline === 'number' ? res.lastOnline : null;
        const online = showOnlineSetting && lastOnline ? (Date.now() - lastOnline < 180_000) : false;
        const data: ZaloLastOnlineResponse = {
          online,
          lastOnline,
          presenceText: online ? 'Đang hoạt động' : this.formatPresenceText(lastOnline),
        };
        try {
          await this.redis.cacheSet(cacheKey, data, 180);
        } catch {
          // ignore cache set failures
        }
        return data;
      } catch {
        return null;
      } finally {
        this.lastOnlineInflight.delete(inflightKey);
      }
    })();

    this.lastOnlineInflight.set(inflightKey, promise);
    return promise;
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

      let attachmentSource: any;
      if (first.url.startsWith('data:')) {
        const match = first.url.match(/^data:([^;]+);name=([^;]+);base64,(.+)$/);
        if (match) {
          const [, mimeType, encodedName, base64Data] = match;
          const fileName = decodeURIComponent(encodedName);
          const buffer = Buffer.from(base64Data, 'base64');
          attachmentSource = {
            data: buffer,
            filename: fileName,
            metadata: {
              totalSize: buffer.length,
            },
          };
        } else {
          attachmentSource = first.url;
        }
      } else {
        attachmentSource = first.url;
      }

      return api.sendMessage?.(
        {
          msg: first.caption ?? msg.text ?? '',
          attachments: attachmentSource,
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
      onReaction?: (reaction: any) => Promise<void> | void;
      onGroupEvent?: (event: any) => Promise<void> | void;
      onUndo?: (event: any) => Promise<void> | void;
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
    api.listener.on?.('reaction', (reaction: unknown) => {
      if (callbacks.onReaction) {
        void callbacks.onReaction(reaction);
      }
    });
    api.listener.on?.('group_event', (event: unknown) => {
      if (callbacks.onGroupEvent) {
        void callbacks.onGroupEvent(event);
      }
    });
    api.listener.on?.('undo', (event: unknown) => {
      if (callbacks.onUndo) {
        void callbacks.onUndo(event);
      }
    });
  }

  async getGroupInfo(botExternalId: string, groupId: string): Promise<any | null> {
    const api = this.instances.get(botExternalId) as {
      getGroupInfo?: (groupId: string | string[]) => Promise<{ gridInfoMap?: Record<string, any> }>;
    } | undefined;
    if (typeof api?.getGroupInfo !== 'function') return null;
    try {
      const res = await api.getGroupInfo(groupId);
      return res?.gridInfoMap?.[groupId] ?? null;
    } catch {
      return null;
    }
  }

  async getAllGroups(botExternalId: string): Promise<string[]> {
    const api = this.instances.get(botExternalId) as {
      getAllGroups?: () => Promise<{ gridVerMap?: Record<string, string> }>;
    } | undefined;
    if (typeof api?.getAllGroups !== 'function') return [];
    try {
      const res = await api.getAllGroups();
      return Object.keys(res?.gridVerMap ?? {});
    } catch {
      return [];
    }
  }

  async getGroupChatHistory(botExternalId: string, groupId: string, count?: number): Promise<any | null> {
    const api = this.instances.get(botExternalId) as {
      getGroupChatHistory?: (groupId: string, count?: number) => Promise<{ groupMsgs?: any[] }>;
    } | undefined;
    if (typeof api?.getGroupChatHistory !== 'function') return null;
    try {
      return await api.getGroupChatHistory(groupId, count);
    } catch {
      return null;
    }
  }

  async addReaction(
    botExternalId: string,
    threadId: string,
    threadType: number,
    messageExternalId: string,
    reactIcon: string,
  ): Promise<any> {
    const api = this.instances.get(botExternalId) as any;
    if (!api || typeof api.addReaction !== 'function') {
      throw new Error(`addReaction not supported by bot: ${botExternalId}`);
    }

    // Resolve msgId and cliMsgId based on message in DB
    let msgId = messageExternalId;
    let cliMsgId = '0';

    try {
      const bot = await (this.prisma as any).bot.findUnique({
        where: { channel_externalId: { channel: 'zalo', externalId: botExternalId } },
        select: { id: true },
      });
      if (bot) {
        const conversation = await (this.prisma as any).conversation.findFirst({
          where: { botId: bot.id, threadExternalId: threadId },
          select: { id: true },
        });
        if (conversation) {
          const message = await (this.prisma as any).message.findUnique({
            where: {
              conversationId_messageExternalId: {
                conversationId: conversation.id,
                messageExternalId,
              },
            },
          });
          if (message) {
            if (message.direction === 'out') {
              // Outbound message: we need its original cliMsgId
              msgId = '0';
              if (message.raw && typeof message.raw === 'object') {
                const raw = message.raw as any;
                const data = raw.data || {};
                cliMsgId = String(raw.cliMsgId || data.cliMsgId || '0');
              }
              if (cliMsgId === '0' || !cliMsgId) {
                // Fallback to createdAt timestamp as client ID representation
                cliMsgId = String(message.createdAt.getTime());
              }
            } else {
              // Inbound message: msgId is global message ID, cliMsgId is '0'
              msgId = messageExternalId;
              cliMsgId = '0';
            }
          }
        }
      }
    } catch (dbErr) {
      console.warn(`[ZaloZcaService.addReaction] Error querying DB for message:`, dbErr);
    }

    console.log(`[ZaloZcaService.addReaction] Calling ZCA addReaction:`, {
      reactIcon,
      messageExternalId,
      msgId,
      cliMsgId,
      threadId,
      threadType,
    });

    try {
      const res = await api.addReaction(reactIcon, {
        data: {
          msgId,
          cliMsgId,
        },
        threadId,
        type: threadType,
      });
      console.log(`[ZaloZcaService.addReaction] ZCA addReaction result:`, res);
      return res;
    } catch (err) {
      console.error(`[ZaloZcaService.addReaction] ZCA addReaction error:`, err);
      throw err;
    }
  }

  async undo(
    botExternalId: string,
    messageExternalId: string,
    threadId: string,
    threadType: number,
  ): Promise<any> {
    const api = this.instances.get(botExternalId) as any;
    if (!api || typeof api.undo !== 'function') {
      throw new Error(`undo not supported by bot: ${botExternalId}`);
    }

    let msgId = messageExternalId;
    let cliMsgId = '0';

    try {
      const bot = await (this.prisma as any).bot.findUnique({
        where: { channel_externalId: { channel: 'zalo', externalId: botExternalId } },
        select: { id: true },
      });
      if (bot) {
        const conversation = await (this.prisma as any).conversation.findFirst({
          where: { botId: bot.id, threadExternalId: threadId },
          select: { id: true },
        });
        if (conversation) {
          const message = await (this.prisma as any).message.findUnique({
            where: {
              conversationId_messageExternalId: {
                conversationId: conversation.id,
                messageExternalId,
              },
            },
          });
          if (message) {
            msgId = messageExternalId;
            if (message.direction === 'out') {
              if (message.raw && typeof message.raw === 'object') {
                const raw = message.raw as any;
                const data = raw.data || {};
                cliMsgId = String(raw.cliMsgId || data.cliMsgId || '0');
              }
              if (cliMsgId === '0' || !cliMsgId) {
                cliMsgId = String(message.createdAt.getTime());
              }
            } else {
              cliMsgId = '0';
            }
          }
        }
      }
    } catch (dbErr) {
      console.warn(`[ZaloZcaService.undo] Error querying DB for message:`, dbErr);
    }

    console.log(`[ZaloZcaService.undo] Calling ZCA undo:`, {
      msgId,
      cliMsgId,
      threadId,
      threadType,
    });

    try {
      const res = await api.undo(
        {
          msgId,
          cliMsgId,
        },
        threadId,
        threadType,
      );
      return res;
    } catch (err) {
      console.error(`[ZaloZcaService.undo] ZCA error:`, err);
      throw err;
    }
  }

  async sendTypingEvent(
    botExternalId: string,
    threadId: string,
    threadType: number,
    isTyping: boolean,
  ): Promise<any> {
    const api = this.instances.get(botExternalId) as any;
    if (!api || typeof api.sendTypingEvent !== 'function') {
      console.warn(`sendTypingEvent not supported by bot: ${botExternalId}`);
      return null;
    }

    try {
      return await api.sendTypingEvent(threadId, threadType, isTyping);
    } catch (err) {
      console.error(`[ZaloZcaService.sendTypingEvent] ZCA error:`, err);
      return null;
    }
  }

  async pinMessage(
    botExternalId: string,
    threadId: string,
    messageExternalId: string,
    pinAct: boolean,
  ): Promise<any> {
    const api = this.instances.get(botExternalId) as any;
    if (!api) {
      throw new Error(`Bot instance not found: ${botExternalId}`);
    }

    if (typeof api.pinMessage !== 'function') {
      api.custom('pinMessage', async ({ ctx, utils, props }: any) => {
        const isPin = props.pinAct === 1 || props.pinAct === true;
        const pinActVal = isPin ? 1 : 2;
        const endpoint = isPin ? '/api/board/topic/createv2' : '/api/board/topic/updatev2';
        const serviceURL = utils.makeURL(`${api.zpwServiceMap.group_board[0]}${endpoint}`);
        const params: any = {
          grid: props.groupId,
          type: 2, // Message
          color: -16777216,
          emoji: "",
          startTime: -1,
          duration: -1,
          params: JSON.stringify({
            senderUid: props.senderUid || "",
            senderName: props.senderName || "",
            client_msg_id: props.clientMsgId || "",
            global_msg_id: props.globalMsgId || "",
            msg_type: props.msgType || 1,
            title: props.title || "",
          }),
          repeat: 0,
          imei: ctx.imei,
          pinAct: pinActVal,
        };

        if (isPin) {
          params.src = 1;
        } else {
          params.topicId = props.topicId || "";
        }

        const encryptedParams = utils.encodeAES(JSON.stringify(params));
        if (!encryptedParams) throw new Error("Failed to encrypt params");
        const response = await utils.request(serviceURL, {
          method: "POST",
          body: new URLSearchParams({
            params: encryptedParams,
          }),
        });
        return utils.resolve(response, (result: any) => result.data);
      });
    }

    const bot = await (this.prisma as any).bot.findUnique({
      where: { channel_externalId: { channel: 'zalo', externalId: botExternalId } },
      select: { id: true },
    });
    if (!bot) throw new Error('Bot not found');

    const conversation = await (this.prisma as any).conversation.findFirst({
      where: { botId: bot.id, threadExternalId: threadId },
      select: { id: true },
    });
    if (!conversation) throw new Error('Conversation not found');

    const message = await (this.prisma as any).message.findUnique({
      where: {
        conversationId_messageExternalId: {
          conversationId: conversation.id,
          messageExternalId,
        },
      },
    });
    if (!message) throw new Error('Message not found');

    const participant = await (this.prisma as any).participant.findFirst({
      where: { conversationId: conversation.id, externalId: message.senderExternalId || undefined },
      select: { displayName: true },
    });
    const senderName = participant?.displayName || 'Thành viên';

    let client_msg_id = '0';
    if (message.raw && typeof message.raw === 'object') {
      const raw = message.raw as any;
      const data = raw.data || {};
      client_msg_id = String(raw.cliMsgId || data.cliMsgId || '0');
    }
    if (client_msg_id === '0' || !client_msg_id) {
      client_msg_id = String(message.createdAt.getTime());
    }

    let msg_type = 1;
    let title = message.text || '';
    if (message.attachments && Array.isArray(message.attachments) && message.attachments.length > 0) {
      const firstAttach = message.attachments[0] as any;
      if (firstAttach.type === 'image') {
        msg_type = 32;
        title = '[Hình ảnh]';
      } else if (firstAttach.type === 'video') {
        msg_type = 44;
        title = '[Video]';
      } else if (firstAttach.type === 'file') {
        msg_type = 46;
        title = firstAttach.name || '[File]';
      }
    }

    try {
      return await api.pinMessage({
        groupId: threadId,
        senderUid: message.senderExternalId || botExternalId,
        senderName,
        clientMsgId: client_msg_id,
        globalMsgId: message.messageExternalId,
        msgType: msg_type,
        title,
        pinAct: true,
      });
    } catch (err) {
      console.error('[ZaloZcaService.pinMessage] Error pinning message:', err);
      throw err;
    }
  }

  async unpinMessage(
    botExternalId: string,
    threadId: string,
    topicId: string,
  ): Promise<any> {
    const api = this.instances.get(botExternalId) as any;
    if (!api) {
      throw new Error(`Bot instance not found: ${botExternalId}`);
    }

    if (typeof api.pinMessage !== 'function') {
      // Re-use same registration logic to ensure consistency
      this.pinMessage(botExternalId, threadId, '', false).catch(() => {});
    }

    try {
      return await api.pinMessage({
        groupId: threadId,
        topicId,
        pinAct: false,
      });
    } catch (err) {
      console.error('[ZaloZcaService.unpinMessage] Error unpinning message:', err);
      throw err;
    }
  }

  async getListBoard(
    botExternalId: string,
    threadId: string,
  ): Promise<any> {
    const api = this.instances.get(botExternalId) as any;
    if (!api || typeof api.getListBoard !== 'function') {
      throw new Error(`getListBoard not supported by bot: ${botExternalId}`);
    }

    try {
      return await api.getListBoard({ page: 1, count: 20 }, threadId);
    } catch (err) {
      console.error('[ZaloZcaService.getListBoard] Error fetching list board:', err);
      throw err;
    }
  }

  async getFriendBoardList(
    botExternalId: string,
    threadId: string,
  ): Promise<any> {
    const api = this.instances.get(botExternalId) as any;
    if (!api || typeof api.getFriendBoardList !== 'function') {
      throw new Error(`getFriendBoardList not supported by bot: ${botExternalId}`);
    }

    try {
      return await api.getFriendBoardList(threadId);
    } catch (err) {
      console.error('[ZaloZcaService.getFriendBoardList] Error fetching friend board list:', err);
      throw err;
    }
  }

  async getPinnedMessages(
    botExternalId: string,
    threadId: string,
    threadType: 'user' | 'group',
  ): Promise<any[]> {
    const api = this.instances.get(botExternalId) as any;
    if (!api) return [];
    try {
      if (threadType === 'user') {
        if (typeof api.getFriendBoardList !== 'function') return [];
        const res = await api.getFriendBoardList(threadId);
        const items = res?.data || [];
        return items.map((item: any) => {
          let params = item.params;
          if (typeof params === 'string') {
            try { params = JSON.parse(params); } catch { params = {}; }
          }
          return {
            id: String(item.id),
            creatorId: String(item.creatorId || ''),
            createTime: Number(item.createTime || Date.now()),
            params: {
              title: params?.title || '',
              senderName: params?.senderName || 'Thành viên',
              client_msg_id: params?.client_msg_id || undefined,
            },
          };
        });
      } else {
        if (typeof api.getListBoard !== 'function') return [];
        const res = await api.getListBoard({ page: 1, count: 20 }, threadId);
        const boardItems = res?.items || [];
        const pinBoard = boardItems.find((b: any) => b.boardType === 2);
        const items = pinBoard?.data || [];
        return items.map((item: any) => {
          let params = item.params;
          if (typeof params === 'string') {
            try { params = JSON.parse(params); } catch { params = {}; }
          }
          return {
            id: String(item.id),
            creatorId: String(item.creatorId || ''),
            createTime: Number(item.createTime || Date.now()),
            params: {
              title: params?.title || '',
              senderName: params?.senderName || 'Thành viên',
              client_msg_id: params?.client_msg_id || undefined,
            },
          };
        });
      }
    } catch (err) {
      console.error('[ZaloZcaService.getPinnedMessages] Error:', err);
      return [];
    }
  }
}
