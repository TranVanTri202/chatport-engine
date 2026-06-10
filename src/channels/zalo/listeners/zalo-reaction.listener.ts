import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { DOMAIN_EVENTS } from '@/shared/events/domain-events';

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
    private readonly prisma: PrismaService,
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

      // Resolve bot
      const bot = await this.prisma.bot.findUnique({
        where: { id: botId },
        select: { customerId: true },
      });
      if (!bot) return;

      // Find conversation
      const conversation = await this.prisma.conversation.findFirst({
        where: { botId, threadExternalId: String(threadId) },
        select: { id: true },
      });
      if (!conversation) return;

      // Find message
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
        // Fallback: search by timestamp close to cMsgID
        const cMsgTime = new Date(Number(cMsgID));
        const startTime = new Date(cMsgTime.getTime() - 2000);
        const endTime = new Date(cMsgTime.getTime() + 2000);

        message = await this.prisma.message.findFirst({
          where: {
            conversationId: conversation.id,
            createdAt: { gte: startTime, lte: endTime },
          },
          orderBy: { createdAt: 'asc' },
        });
      }

      if (!message) return;

      // Parse existing reactions
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

      // Remove this user's existing reaction
      reactionsList = reactionsList.filter((r) => r.userId !== String(uidFrom));

      // Add new reaction if present
      if (rIcon && rIcon !== '') {
        const emoji = EMOJI_MAP[rIcon] || rIcon;
        reactionsList.push({
          userId: String(uidFrom),
          userName: dName,
          reaction: emoji,
        });
      }

      // Update DB
      await this.prisma.message.update({
        where: { id: message.id },
        data: { reactions: reactionsList as any },
      });

      // Emit domain event
      this.eventEmitter.emit(DOMAIN_EVENTS.MessageReacted, {
        customerId: bot.customerId,
        conversationId: conversation.id,
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
