import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { DOMAIN_EVENTS } from '@/shared/events/domain-events';

/**
 * Handles Zalo undo (message recall/delete) events.
 */
@Injectable()
export class ZaloUndoListener {
  private readonly logger = new Logger(ZaloUndoListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async handle(botId: number, _botExternalId: string, event: any): Promise<void> {
    const msgId = event?.data?.content?.globalMsgId
      ? String(event.data.content.globalMsgId)
      : event?.data?.msgId
        ? String(event.data.msgId)
        : undefined;

    if (!msgId) {
      this.logger.warn(`[handleUndo] No msgId or globalMsgId found in event data`);
      return;
    }

    try {
      // Resolve bot & customer
      const bot = await this.prisma.bot.findUnique({
        where: { id: botId },
        select: { customerId: true },
      });
      if (!bot) {
        this.logger.warn(`[handleUndo] Bot not found for botId=${botId}`);
        return;
      }

      // Find message in DB
      const message = await this.prisma.message.findFirst({
        where: {
          conversation: { botId },
          messageExternalId: String(msgId),
        },
      });

      if (message) {
        this.logger.log(
          `[handleUndo] Found message ID=${message.id} (externalId=${msgId}), marking as recalled`,
        );
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

        this.eventEmitter.emit(DOMAIN_EVENTS.MessageRecalled, {
          customerId: bot.customerId,
          conversationId: message.conversationId,
          messageExternalId: String(msgId),
        });
      } else {
        this.logger.warn(
          `[handleUndo] Message not found in DB for messageExternalId=${msgId} botId=${botId}`,
        );
      }
    } catch (error) {
      this.logger.error(`Error handling undo event for botId=${botId}: ${(error as Error).message}`);
    }
  }
}
