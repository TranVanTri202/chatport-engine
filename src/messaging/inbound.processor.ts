import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MESSAGING_INBOUND_QUEUE } from '@/shared/types';
import { InboundMessageDto } from './dto/inbound-message.dto';
import { MessageHandler } from './message.handler';

@Processor(MESSAGING_INBOUND_QUEUE, { concurrency: 10 })
export class InboundProcessor extends WorkerHost {
  private readonly logger = new Logger(InboundProcessor.name);

  constructor(private readonly handler: MessageHandler) {
    super();
  }

  async process(job: Job<InboundMessageDto>): Promise<void> {
    await this.handler.handle(job.data);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<InboundMessageDto>, err: Error): void {
    this.logger.error(
      `inbound job ${job.id} (attempts=${job.attemptsMade}) failed: ${err.message}`,
      err.stack,
    );
  }
}
