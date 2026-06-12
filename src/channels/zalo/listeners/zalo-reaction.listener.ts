import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BotRepository } from '@/bot/repositories/bot.repository';
import { DOMAIN_EVENTS } from '@/shared/events/domain-events';
import { ZaloRepository } from '../repositories/zalo.repository';

const EMOJI_MAP: Record<string, string> = {
  '/-heart': '❤️',
  '/-strong': '👍',
  ':>': '😂',
  ':o': '😮',
  ':-((': '😢',
  ':-h': '😡',
};

/**
 * Handles Zalo message reaction events.
 */
@Injectable()
export class ZaloReactionListener {
  private readonly logger = new Logger(ZaloReactionListener.name);

  constructor(
    private readonly botRepo: BotRepository,
    private readonly zaloRepo: ZaloRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async handle(botId: number, _botExternalId: string, event: any): Promise<void> {
    try {
      const gMsg = event?.data?.content?.rMsg?.[0];
      const gMsgID = gMsg?.gMsgID ? String(gMsg.gMsgID) : null;
      const cMsgID = gMsg?.cMsgID ? String(gMsg.cMsgID) : null;
      const threadId = event?.threadId;
      if (!threadId) return;

      const uidFrom = event?.data?.uidFrom;
      const rIcon = event?.data?.content?.rIcon;
      const dName = event?.data?.dName || 'User';

      const bot = await this.botRepo.findById(botId);
      if (!bot) return;

      const conversationId = await this.zaloRepo.findConversationIdByBotAndThread(botId, String(threadId));
      if (!conversationId) return;

      let message = null;
      if (gMsgID && gMsgID !== '0') {
        message = await this.zaloRepo.findMessageByCompositeKey(conversationId, gMsgID);
      }

      if (!message && cMsgID) {
        const cMsgTime = new Date(Number(cMsgID));
        const startTime = new Date(cMsgTime.getTime() - 2000);
        const endTime = new Date(cMsgTime.getTime() + 2000);

        message = await this.zaloRepo.findMessageByTimeRange(conversationId, startTime, endTime);
      }

      if (!message) return;

      let reactionsList: Array<{
        userId: string;
        userName: string;
        reaction: string;
      }> = [];

      if (message.reactions && typeof message.reactions === 'string') {
        try {
          reactionsList = JSON.parse(message.reactions);
        } catch {
          // ignore parse errors
        }
      } else if (Array.isArray(message.reactions)) {
        reactionsList = message.reactions as any;
      }

      reactionsList = reactionsList.filter((r) => r.userId !== String(uidFrom));

      if (rIcon && rIcon !== '') {
        const emoji = EMOJI_MAP[rIcon] || rIcon;
        reactionsList.push({
          userId: String(uidFrom),
          userName: dName,
          reaction: emoji,
        });
      }

      await this.zaloRepo.updateMessageReactions(message.id, reactionsList);

      this.eventEmitter.emit(DOMAIN_EVENTS.MessageReacted, {
        customerId: bot.customerId,
        conversationId,
        messageExternalId: message.messageExternalId,
        reactions: reactionsList,
      });
    } catch (error) {
      this.logger.error(
        `Error handling reaction_event for botId=${botId}: ${(error as Error).message}`,
      );
    }
  }
}
