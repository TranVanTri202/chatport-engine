import { Injectable, Logger } from '@nestjs/common';
import { BotStatus } from '@prisma/client';
import { MessagingPublisher } from '@/messaging/messaging.publisher';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { ZaloNormalizer, ZaloRawMessage } from './zalo.normalizer';
import { ZaloInstanceRegistry } from './zalo-instance.registry';

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
  ) {}

  attach(api: unknown, bot: { id: number; externalId: string }): void {
    const client = api as {
      listener?: {
        start?: () => void;
        on?: (event: string, handler: (...args: unknown[]) => void) => void;
      };
    };

    client.listener?.start?.();
    client.listener?.on?.('message', async (message: unknown) => {
      const raw = message as ZaloRawMessage;
      await this.dispatchMessage(bot.externalId, raw);
    });
    client.listener?.on?.('closed', async (code: unknown) => {
      if (code === 3003) await this.handleClosed3003(bot.externalId);
    });

    this.logger.log(`Attached Zalo listeners for bot=${bot.id} uid=${bot.externalId}`);
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
}
