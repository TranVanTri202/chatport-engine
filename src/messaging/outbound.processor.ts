import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Job } from 'bullmq';
import { randomUUID } from 'node:crypto';
import { ChannelRegistry } from '@/channels/channel-registry.service';
import { ConversationService } from '@/conversations/conversation.service';
import { MessageService } from '@/conversations/message.service';
import { RealtimeGateway } from '@/realtime/realtime.gateway';
import { BotRepository } from '@/bot/repositories/bot.repository';
import { RedisService } from '@/shared/redis/redis.service';
import {
  ChannelExpiredError,
  LockedError,
} from '@/shared/errors/channel.errors';
import {
  BotStatus,
  MESSAGING_OUTBOUND_QUEUE,
  MessageDirection,
} from '@/shared/types';
import {
  BotStatusChangedEvent,
  DOMAIN_EVENTS,
  MessageSentEvent,
} from '@/shared/events/domain-events';
import { OutboundMessageDto } from './dto/outbound-message.dto';

const LOCK_TTL_MS = 15_000;

@Processor(MESSAGING_OUTBOUND_QUEUE, {
  concurrency: 5,
  limiter: { max: 5, duration: 1000 },
})
export class OutboundProcessor extends WorkerHost {
  private readonly logger = new Logger(OutboundProcessor.name);

  constructor(
    private readonly registry: ChannelRegistry,
    private readonly botRepo: BotRepository,
    private readonly redis: RedisService,
    private readonly conversations: ConversationService,
    private readonly messages: MessageService,
    private readonly realtime: RealtimeGateway,
    private readonly events: EventEmitter2,
  ) {
    super();
  }

  async process(job: Job<OutboundMessageDto>): Promise<void> {
    const msg = job.data;
    const lockKey = `lock:send:${msg.botExternalId}:${msg.threadId}`;
    const token = randomUUID();

    const got = await this.redis.acquireLock(lockKey, token, LOCK_TTL_MS);
    if (!got) throw new LockedError(lockKey);

    try {
      const adapter = this.registry.get(msg.channel);
      try {
        await adapter.send(msg.botExternalId, {
          threadId: msg.threadId,
          threadType: msg.threadType,
          type: msg.type,
          text: msg.text,
          attachments: msg.attachments,
          quote: msg.quote,
        });
      } catch (err) {
        if (err instanceof ChannelExpiredError) {
          await this.markExpired(msg.botId);
          return;
        }
        throw err;
      }

      // We no longer persist the outbound message here.
      // Instead, we let the channel's listener (webhook/event listener) capture the sent event
      // and call MessageHandler.handle, which will persist the message with the proper Zalo message ID
      // and CDN URLs, and emit DOMAIN_EVENTS.MessageReceived (message:new).
    } finally {
      await this.redis.releaseLock(lockKey, token);
    }
  }

  private async markExpired(botId: number): Promise<void> {
    const updated = await this.botRepo.update(botId, { status: BotStatus.expired as any });
    const evt: BotStatusChangedEvent = {
      botId: updated.id,
      customerId: updated.customerId,
      from: BotStatus.active,
      to: BotStatus.expired,
      reason: 'channel.expired',
    };
    this.events.emit(DOMAIN_EVENTS.BotStatusChanged, evt);
    this.logger.warn(`Bot ${botId} marked expired; outbound dropped`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<OutboundMessageDto>, err: Error): void {
    this.logger.error(
      `outbound job ${job.id} (attempts=${job.attemptsMade}) failed: ${err.message}`,
    );
  }

  @OnWorkerEvent('stalled')
  onStalled(jobId: string): void {
    this.logger.warn(`outbound job ${jobId} stalled`);
  }
}
