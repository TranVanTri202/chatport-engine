import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BotStatus } from '@prisma/client';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { DOMAIN_EVENTS } from '@/shared/events/domain-events';
import { MessagingPublisher } from '@/messaging/messaging.publisher';
import { ZaloNormalizer, ZaloRawMessage } from '../zalo.normalizer';
import { ZaloInstanceRegistry } from '../zalo-instance.registry';
import { ZaloZcaService } from '../zalo-zca.service';
import { ZaloFriendListener } from './zalo-friend.listener';
import { ZaloUserchatListener } from './zalo-userchat.listener';
import { ZaloReactionListener } from './zalo-reaction.listener';
import { ZaloGroupListener } from './zalo-group.listener';
import { ZaloUndoListener } from './zalo-undo.listener';

/**
 * Orchestrator: attaches Zalo event listeners and dispatches events to
 * specialized sub-listeners. Each sub-listener owns a single domain:
 * friend, userchat (pin/unpin in 1-1), reaction, group, undo.
 *
 * Typing indicator is handled by ZaloTypingListener via @OnEvent.
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
    private readonly friendListener: ZaloFriendListener,
    private readonly userchatListener: ZaloUserchatListener,
    private readonly reactionListener: ZaloReactionListener,
    private readonly groupListener: ZaloGroupListener,
    private readonly undoListener: ZaloUndoListener,
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
        await this.dispatchFriendEvent(botId, botExternalId, event);
      },
      onReaction: async (reaction) => {
        await this.reactionListener.handle(botId, botExternalId, reaction);
      },
      onGroupEvent: async (event) => {
        await this.groupListener.handle(botId, botExternalId, event);
      },
      onUndo: async (event) => {
        await this.undoListener.handle(botId, botExternalId, event);
      },
    });

    this.logger.log(`Attached Zalo listeners for bot=${botId} uid=${botExternalId}`);
  }

  /** Normalize and publish inbound message to BullMQ */
  private async dispatchMessage(
    botExternalId: string,
    raw: ZaloRawMessage,
  ): Promise<void> {
    const payload = (raw.data ?? raw) as any;
    const content = payload?.content;
    if (
      content &&
      typeof content === 'object' &&
      content.action === 'msginfo.actionlist'
    ) {
      this.logger.log(
        `Ignoring raw Zalo system action message: msgId=${payload.msgId}`,
      );
      return;
    }

    const inbound = this.normalizer.normalizeMessage({ botExternalId, raw });
    await this.publisher.publishInbound(inbound);

    const isSelf = String(payload.uidFrom ?? raw.senderId ?? '') === botExternalId;
    if (!isSelf) {
      const threadTypeNum = (raw.threadType === 'group' || String(raw.threadType) === '1' || (raw as any).type === 1) ? 1 : 0;
      const threadId = String(raw.threadId ?? payload.uidFrom ?? payload.idTo ?? '');
      if (threadId) {
        void this.zca.sendDeliveredEvent(botExternalId, threadId, threadTypeNum, raw);
      }
    }
  }

  /** Dispatch friend_event: types 0-7 → friendListener, types 10-11 → userchatListener */
  private async dispatchFriendEvent(
    botId: number,
    botExternalId: string,
    event: any,
  ): Promise<void> {
    const type = event?.type;

    if (type === 10 || type === 11) {
      // Pin/unpin in 1-to-1 chat
      await this.userchatListener.handle(botId, botExternalId, event);
    } else if (type === undefined) {
      this.logger.warn(`friend_event without type for botId=${botId}`);
    } else {
      await this.friendListener.handle(botId, botExternalId, event);
    }
  }

  /** Zalo connection closed with code 3003 (cookie expired) */
  private async handleClosed3003(botExternalId: string): Promise<void> {
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
}
