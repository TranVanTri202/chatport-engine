import { Injectable, Logger } from '@nestjs/common';
import { MessagingPublisher } from '@/messaging/messaging.publisher';
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
  ) {}

  /**
   * Attach the 7 documented events to a zca-js API instance for a given bot.
   * Concrete subscription wiring is filled in once `zca-js` is installed.
   */
  attach(_api: unknown, bot: { id: number; externalId: string }): void {
    // TODO: api.listener.on('message', …); on('reaction'); on('friend_event');
    // on('undo'); on('group_event'); on('closed'); on('error');
    this.logger.warn(
      `ZaloListeners.attach for bot=${bot.id} (uid=${bot.externalId}) not implemented yet`,
    );
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
    // BotResponseService listens to bot:expired socket events to surface UI.
    this.logger.warn(`Zalo cookie expired for uid=${botExternalId}`);
  }
}
