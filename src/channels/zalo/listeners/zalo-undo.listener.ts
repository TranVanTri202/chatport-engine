import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BotRepository } from '@/bot/repositories/bot.repository';
import { DOMAIN_EVENTS } from '@/shared/events/domain-events';
import { ZaloRepository } from '../repositories/zalo.repository';

/**
 * Handles Zalo undo (message recall/delete) events.
 */
@Injectable()
export class ZaloUndoListener {
  private readonly logger = new Logger(ZaloUndoListener.name);

  constructor(
    private readonly botRepo: BotRepository,
    private readonly zaloRepo: ZaloRepository,
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
      const bot = await this.botRepo.findById(botId);
      if (!bot) {
        this.logger.warn(`[handleUndo] Bot not found for botId=${botId}`);
        return;
      }

      const message = await this.zaloRepo.findMessageByExternalForBot(botId, String(msgId));

      if (message) {
        this.logger.log(
          `[handleUndo] Found message ID=${message.id} (externalId=${msgId}), marking as recalled`,
        );
        const rawObj = (message.raw as Record<string, any>) || {};
        await this.zaloRepo.updateMessageRaw(message.id, {
          ...rawObj,
          isRecalled: true,
          recalledAt: new Date().toISOString(),
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
