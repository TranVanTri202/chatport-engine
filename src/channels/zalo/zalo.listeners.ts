import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { BotStatus, ThreadType } from '@prisma/client';
import { MessagingPublisher } from '@/messaging/messaging.publisher';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { DOMAIN_EVENTS } from '@/shared/events/domain-events';
import { ZaloNormalizer, ZaloRawMessage } from './zalo.normalizer';
import { ZaloInstanceRegistry } from './zalo-instance.registry';
import { ZaloZcaService } from './zalo-zca.service';

/**
 * Attach zca-js event listeners and forward `message` events into the
 * channel-agnostic inbound queue. Side-events (reaction, undo, group_event,
 * friend_event, closed, error) are logged for now and will get their own
 * queue (`messaging-side-events`) in a later milestone.
 *
 * Adapter-private.
 */
@Injectable()
export class ZaloListeners {
  private readonly logger = new Logger(ZaloListeners.name);

  constructor(
    private readonly normalizer: ZaloNormalizer,
    private readonly publisher: MessagingPublisher,
    private readonly instances: ZaloInstanceRegistry,
    private readonly prisma: PrismaService,
    private readonly zca: ZaloZcaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  attach(botExternalId: string, botId: number): void {
    this.zca.attachListeners(botExternalId, {
      onMessage: async (message) => {
        const raw = message as ZaloRawMessage;
        await this.dispatchMessage(botExternalId, raw);
      },
      onClosed: async (code) => {
        if (code === 3003) await this.handleClosed3003(botExternalId);
      },
      onFriendEvent: async (event) => {
        await this.handleFriendEvent(botId, botExternalId, event);
      },
      onReaction: async (reaction) => {
        await this.handleReaction(botId, botExternalId, reaction);
      },
      onGroupEvent: async (event) => {
        await this.handleGroupEvent(botId, botExternalId, event);
      },
      onUndo: async (event) => {
        await this.handleUndo(botId, botExternalId, event);
      },
    });

    this.logger.log(`Attached Zalo listeners for bot=${botId} uid=${botExternalId}`);
  }

  /** Called from `attach` once an inbound `message` event is normalized. */
  protected async dispatchMessage(
    botExternalId: string,
    raw: ZaloRawMessage,
  ): Promise<void> {
    const inbound = this.normalizer.normalizeMessage({ botExternalId, raw });
    await this.publisher.publishInbound(inbound);
  }

  /** Called from `attach` when zca-js emits `closed` with code 3003. */
  protected async handleClosed3003(botExternalId: string): Promise<void> {
    this.instances.delete(botExternalId);

    await this.prisma.bot.updateMany({
      where: {
        channel: 'zalo',
        externalId: botExternalId,
      },
      data: {
        status: BotStatus.expired,
      },
    });

    this.logger.warn(`Zalo cookie expired for uid=${botExternalId}`);
  }

  /** Handle real-time friend/contact sync events from Zalo */
  protected async handleFriendEvent(
    botId: number,
    botExternalId: string,
    event: any,
  ): Promise<void> {
    this.logger.log(`Received Zalo friend_event: type=${event.type} for botId=${botId}`);
    try {
      const type = event.type;
      if (type === 0) { // ADD
        const friendUid = event.data as string;
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
      } else if (type === 1) { // REMOVE
        const friendUid = event.data as string;
        this.logger.log(`Friend removed: ${friendUid}`);
        await this.prisma.contact.updateMany({
          where: { botId, externalId: friendUid },
          data: { isFriend: false },
        });
      } else if (type === 2) { // REQUEST
        const reqData = event.data as { fromUid: string; message: string };
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
      } else if (type === 3 || type === 4) { // UNDO_REQUEST or REJECT_REQUEST
        const reqData = event.data as { fromUid: string };
        const senderUid = reqData.fromUid;
        this.logger.log(`Friend request cancelled/declined for: ${senderUid}`);
        await this.prisma.friendRequest.deleteMany({
          where: { botId, externalId: senderUid },
        });
      }
    } catch (error) {
      this.logger.error(`Error handling friend_event for botId=${botId}: ${(error as Error).message}`);
    }
  }

  /** Handle real-time message reaction events from Zalo */
  protected async handleReaction(
    botId: number,
    botExternalId: string,
    event: any,
  ): Promise<void> {
    this.logger.log(`Received Zalo reaction_event: msgId=${event?.data?.content?.rMsg?.[0]?.gMsgID} event: ${JSON.stringify(event)}`);
    try {
      const gMsg = event?.data?.content?.rMsg?.[0];
      const gMsgID = gMsg?.gMsgID ? String(gMsg.gMsgID) : null;
      const cMsgID = gMsg?.cMsgID ? String(gMsg.cMsgID) : null;

      const threadId = event?.threadId;
      if (!threadId) return;

      const uidFrom = event?.data?.uidFrom;
      const rIcon = event?.data?.content?.rIcon; // e.g. "/-heart" or "" if removed
      const dName = event?.data?.dName || 'User';

      // 1. Resolve bot & customer
      const bot = await this.prisma.bot.findUnique({
        where: { id: botId },
        select: { customerId: true },
      });
      if (!bot) return;

      // 2. Find conversation by threadId/externalId
      const conversation = await this.prisma.conversation.findFirst({
        where: { botId, threadExternalId: String(threadId) },
        select: { id: true },
      });
      if (!conversation) return;

      // 3. Find message by conversationId and messageExternalId
      let message = null;
      if (gMsgID && gMsgID !== '0') {
        message = await this.prisma.message.findUnique({
          where: {
            conversationId_messageExternalId: {
              conversationId: conversation.id,
              messageExternalId: gMsgID,
            },
          },
        });
      }

      if (!message && cMsgID) {
        // Fallback: search by createdAt timestamp close to cMsgID (within 2 seconds)
        const cMsgTime = new Date(Number(cMsgID));
        const startTime = new Date(cMsgTime.getTime() - 2000);
        const endTime = new Date(cMsgTime.getTime() + 2000);

        message = await this.prisma.message.findFirst({
          where: {
            conversationId: conversation.id,
            createdAt: {
              gte: startTime,
              lte: endTime,
            },
          },
          orderBy: { createdAt: 'asc' },
        });
      }

      if (!message) return;

      // Parse existing reactions
      let reactionsList: Array<{ userId: string; userName: string; reaction: string }> = [];
      if (message.reactions && typeof message.reactions === 'string') {
        try {
          reactionsList = JSON.parse(message.reactions);
        } catch {}
      } else if (Array.isArray(message.reactions)) {
        reactionsList = message.reactions as any;
      }

      // Filter out this user's existing reaction
      reactionsList = reactionsList.filter((r) => r.userId !== String(uidFrom));

      // Map Zalo reaction icons to Emojis
      const EMOJI_MAP: Record<string, string> = {
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

      // Update message reactions in DB
      await this.prisma.message.update({
        where: { id: message.id },
        data: { reactions: reactionsList as any },
      });

      // Emit MessageReacted domain event
      this.eventEmitter.emit(DOMAIN_EVENTS.MessageReacted, {
        customerId: bot.customerId,
        conversationId: conversation.id,
        messageExternalId: message.messageExternalId,
        reactions: reactionsList,
      });

    } catch (error) {
      this.logger.error(`Error handling reaction_event for botId=${botId}: ${(error as Error).message}`);
    }
  }

  /** Handle real-time group join/leave/update events from Zalo */
  protected async handleGroupEvent(
    botId: number,
    botExternalId: string,
    event: any,
  ): Promise<void> {
    this.logger.log(`Received Zalo group_event: type=${event?.type} threadId=${event?.threadId}`);
    try {
      const threadId = event?.threadId;
      if (!threadId) return;

      const type = event?.type;
      const updateMembers = event?.data?.updateMembers || [];

      // 1. Resolve bot & customer
      const bot = await this.prisma.bot.findUnique({
        where: { id: botId },
        select: { customerId: true },
      });
      if (!bot) return;

      // 2. Find or create the conversation
      let conversation = await this.prisma.conversation.findUnique({
        where: {
          botId_threadExternalId: {
            botId,
            threadExternalId: String(threadId),
          },
        },
      });

      if (!conversation) {
        // Fetch group info from ZCA to populate details on create
        const groupInfo = await this.zca.getGroupInfo(botExternalId, String(threadId));
        conversation = await this.prisma.conversation.create({
          data: {
            botId,
            threadType: ThreadType.group,
            threadExternalId: String(threadId),
            title: groupInfo?.name || 'Zalo Group',
            avatar: groupInfo?.avt || null,
            unread: 0,
            metadata: groupInfo ? { memberCount: groupInfo.totalMember } : {},
          },
        });
      }

      // 3. Process the event type
      if (type === 'join') {
        // Upsert participant records for all members who joined
        for (const member of updateMembers) {
          await this.prisma.participant.upsert({
            where: {
              conversationId_externalId: {
                conversationId: conversation.id,
                externalId: String(member.id),
              },
            },
            create: {
              conversationId: conversation.id,
              externalId: String(member.id),
              displayName: member.dName || 'Zalo Member',
              avatar: member.avatar || null,
              isBot: String(member.id) === botExternalId,
            },
            update: {
              displayName: member.dName || undefined,
              avatar: member.avatar || undefined,
            },
          });
        }

        // Fetch updated group details (title, avt, totalMember)
        const groupInfo = await this.zca.getGroupInfo(botExternalId, String(threadId));
        if (groupInfo) {
          const metadata = (conversation.metadata as Record<string, any>) || {};
          await this.prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              title: groupInfo.name || undefined,
              avatar: groupInfo.avt || undefined,
              metadata: {
                ...metadata,
                memberCount: groupInfo.totalMember,
              },
            },
          });
        }
      } else if (type === 'leave' || type === 'remove_member' || type === 'block_member') {
        // Remove participants from the database
        const memberIds = updateMembers.map((m: any) => String(m.id));
        if (memberIds.length > 0) {
          await this.prisma.participant.deleteMany({
            where: {
              conversationId: conversation.id,
              externalId: { in: memberIds },
            },
          });
        }

        // Check if the bot itself was removed or left the group
        const isBotRemoved = memberIds.includes(botExternalId);
        if (isBotRemoved) {
          this.logger.warn(`Bot ${botId} (${botExternalId}) was removed from or left group ${threadId}`);
          const metadata = (conversation.metadata as Record<string, any>) || {};
          await this.prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              metadata: {
                ...metadata,
                isBotParticipant: false,
                memberCount: 0,
              },
            },
          });
        } else {
          // Sync group info
          const groupInfo = await this.zca.getGroupInfo(botExternalId, String(threadId));
          if (groupInfo) {
            const metadata = (conversation.metadata as Record<string, any>) || {};
            await this.prisma.conversation.update({
              where: { id: conversation.id },
              data: {
                title: groupInfo.name || undefined,
                avatar: groupInfo.avt || undefined,
                metadata: {
                  ...metadata,
                  memberCount: groupInfo.totalMember,
                },
              },
            });
          }
        }
      } else {
        // For other update events (title, setting, avt, etc.), sync group info
        const groupInfo = await this.zca.getGroupInfo(botExternalId, String(threadId));
        if (groupInfo) {
          const metadata = (conversation.metadata as Record<string, any>) || {};
          await this.prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              title: groupInfo.name || undefined,
              avatar: groupInfo.avt || undefined,
              metadata: {
                ...metadata,
                memberCount: groupInfo.totalMember,
              },
            },
          });
        }
      }

      // 4. Emit the domain event to notify components/sockets
      this.eventEmitter.emit(DOMAIN_EVENTS.ConversationUpdated, {
        customerId: bot.customerId,
        conversationId: conversation.id,
      });

    } catch (error) {
      this.logger.error(`Error handling group_event for botId=${botId}: ${(error as Error).message}`);
    }
  }

  /** Handle real-time message undo (recall) event from Zalo */
  async handleUndo(
    botId: number,
    botExternalId: string,
    event: any,
  ): Promise<void> {
    this.logger.log(`Received Zalo undo event: msgId=${event?.data?.msgId} threadId=${event?.threadId} event=${JSON.stringify(event)}`);
    try {
      const msgId = event?.data?.content?.globalMsgId
        ? String(event.data.content.globalMsgId)
        : (event?.data?.msgId ? String(event.data.msgId) : undefined);

      if (!msgId) {
        this.logger.warn(`[handleUndo] No msgId or globalMsgId found in event data`);
        return;
      }

      // 1. Resolve bot & customer
      const bot = await this.prisma.bot.findUnique({
        where: { id: botId },
        select: { customerId: true },
      });
      if (!bot) {
        this.logger.warn(`[handleUndo] Bot not found for botId=${botId}`);
        return;
      }

      // 2. Find message in DB
      const message = await this.prisma.message.findFirst({
        where: {
          conversation: { botId },
          messageExternalId: String(msgId),
        },
      });

      if (message) {
        this.logger.log(`[handleUndo] Found message ID=${message.id} (externalId=${msgId}), marking as recalled`);
        const rawObj = (message.raw as Record<string, any>) || {};
        await this.prisma.message.update({
          where: { id: message.id },
          data: {
            raw: {
              ...rawObj,
              isRecalled: true,
              recalledAt: new Date().toISOString(),
            },
          },
        });

        // 3. Emit MessageRecalled domain event
        this.eventEmitter.emit(DOMAIN_EVENTS.MessageRecalled, {
          customerId: bot.customerId,
          conversationId: message.conversationId,
          messageExternalId: String(msgId),
        });
      } else {
        this.logger.warn(`[handleUndo] Message not found in DB for messageExternalId=${msgId} botId=${botId}`);
      }
    } catch (error) {
      this.logger.error(`Error handling undo event for botId=${botId}: ${(error as Error).message}`);
    }
  }

  @OnEvent('agent.typing')
  async onAgentTyping(payload: {
    customerId: number;
    botExternalId: string;
    threadId: string;
    threadType: 'user' | 'group';
    isTyping: boolean;
  }): Promise<void> {
    this.logger.debug(`ZaloListeners: agent.typing received for bot=${payload.botExternalId} thread=${payload.threadId} typing=${payload.isTyping}`);
    try {
      // Verify bot belongs to customer
      const bot = await this.prisma.bot.findFirst({
        where: {
          externalId: payload.botExternalId,
          customerId: payload.customerId,
          channel: 'zalo',
        },
        select: { id: true },
      });
      if (!bot) return;

      const threadTypeNum = payload.threadType === 'group' ? 1 : 0;
      await this.zca.sendTypingEvent(
        payload.botExternalId,
        payload.threadId,
        threadTypeNum,
        payload.isTyping,
      );
    } catch (err) {
      this.logger.error(`Error handling agent.typing: ${(err as Error).message}`);
    }
  }

  @OnEvent('bot.typing')
  async onBotTyping(payload: {
    botExternalId: string;
    threadId: string;
    threadType: string;
    isTyping: boolean;
  }): Promise<void> {
    this.logger.debug(`ZaloListeners: bot.typing received for bot=${payload.botExternalId} thread=${payload.threadId} typing=${payload.isTyping}`);
    try {
      const threadTypeNum = payload.threadType === 'group' ? 1 : 0;
      await this.zca.sendTypingEvent(
        payload.botExternalId,
        payload.threadId,
        threadTypeNum,
        payload.isTyping,
      );
    } catch (err) {
      this.logger.error(`Error handling bot.typing: ${(err as Error).message}`);
    }
  }
}
