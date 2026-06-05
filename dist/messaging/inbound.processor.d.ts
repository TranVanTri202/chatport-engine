import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InboundMessageDto } from './dto/inbound-message.dto';
import { MessageHandler } from './message.handler';
export declare class InboundProcessor extends WorkerHost {
    private readonly handler;
    private readonly logger;
    constructor(handler: MessageHandler);
    process(job: Job<InboundMessageDto>): Promise<void>;
    onFailed(job: Job<InboundMessageDto>, err: Error): void;
}
