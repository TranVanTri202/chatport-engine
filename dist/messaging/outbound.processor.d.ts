import { WorkerHost } from '@nestjs/bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Job } from 'bullmq';
import { ChannelRegistry } from '@/channels/channel-registry.service';
import { ConversationService } from '@/conversations/conversation.service';
import { MessageService } from '@/conversations/message.service';
import { RealtimeGateway } from '@/realtime/realtime.gateway';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { RedisService } from '@/shared/redis/redis.service';
import { OutboundMessageDto } from './dto/outbound-message.dto';
export declare class OutboundProcessor extends WorkerHost {
    private readonly registry;
    private readonly redis;
    private readonly conversations;
    private readonly messages;
    private readonly realtime;
    private readonly prisma;
    private readonly events;
    private readonly logger;
    constructor(registry: ChannelRegistry, redis: RedisService, conversations: ConversationService, messages: MessageService, realtime: RealtimeGateway, prisma: PrismaService, events: EventEmitter2);
    process(job: Job<OutboundMessageDto>): Promise<void>;
    private markExpired;
    onFailed(job: Job<OutboundMessageDto>, err: Error): void;
    onStalled(jobId: string): void;
}
