import { Queue } from 'bullmq';
import { InboundMessageDto } from './dto/inbound-message.dto';
import { OutboundMessageDto } from './dto/outbound-message.dto';
export declare class MessagingPublisher {
    private readonly inbound;
    private readonly outbound;
    constructor(inbound: Queue, outbound: Queue);
    publishInbound(msg: InboundMessageDto): Promise<void>;
    publishOutbound(msg: OutboundMessageDto): Promise<void>;
}
