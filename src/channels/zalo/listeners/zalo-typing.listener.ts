import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { ZaloZcaService } from '../zalo-zca.service';

/**
 * Handles typing indicator events from both the auto-reply pipeline
 * (`bot.typing`) and the realtime gateway (`agent.typing`).
 */
@Injectable()
export class ZaloTypingListener {
  private readonly logger = new Logger(ZaloTypingListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly zca: ZaloZcaService,
  ) {}

  @OnEvent('agent.typing')
  async onAgentTyping(payload: {
    customerId: number;
    botExternalId: string;
    threadId: string;
    threadType: 'user' | 'group';
    isTyping: boolean;
  }): Promise<void> {
    this.logger.debug(
      `agent.typing received for bot=${payload.botExternalId} thread=${payload.threadId} typing=${payload.isTyping}`,
    );
    try {
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
    this.logger.debug(
      `bot.typing received for bot=${payload.botExternalId} thread=${payload.threadId} typing=${payload.isTyping}`,
    );
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
