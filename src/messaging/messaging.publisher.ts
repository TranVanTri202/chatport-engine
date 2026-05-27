import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  MESSAGING_INBOUND_QUEUE,
  MESSAGING_OUTBOUND_QUEUE,
} from '@/shared/types';
import { InboundMessageDto } from './dto/inbound-message.dto';
import { OutboundMessageDto } from './dto/outbound-message.dto';

/**
 * Channel-agnostic seam used by adapters (inbound) and BotResponseService
 * (outbound) to push work into BullMQ. Importing this in an adapter is
 * the ONLY allowed cross-layer dependency from `channels/` into core.
 */
@Injectable()
export class MessagingPublisher {
  constructor(
    @InjectQueue(MESSAGING_INBOUND_QUEUE) private readonly inbound: Queue,
    @InjectQueue(MESSAGING_OUTBOUND_QUEUE) private readonly outbound: Queue,
  ) {}

  /** Dedup by jobId per plan §14: `${channel}:${botExternalId}:${messageExternalId}`. */
  async publishInbound(msg: InboundMessageDto): Promise<void> {
    const jobId = `${msg.channel}:${msg.botExternalId}:${msg.messageExternalId}`;
    await this.inbound.add('inbound', msg, {
      jobId,
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
  }

  async publishOutbound(msg: OutboundMessageDto): Promise<void> {
    await this.outbound.add('outbound', msg, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
  }
}
