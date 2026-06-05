import { EventEmitter2 } from '@nestjs/event-emitter';
import { MessagingPublisher } from '@/messaging/messaging.publisher';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { ZaloNormalizer, ZaloRawMessage } from './zalo.normalizer';
import { ZaloInstanceRegistry } from './zalo-instance.registry';
import { ZaloZcaService } from './zalo-zca.service';
export declare class ZaloListeners {
    private readonly normalizer;
    private readonly publisher;
    private readonly instances;
    private readonly prisma;
    private readonly zca;
    private readonly eventEmitter;
    private readonly logger;
    constructor(normalizer: ZaloNormalizer, publisher: MessagingPublisher, instances: ZaloInstanceRegistry, prisma: PrismaService, zca: ZaloZcaService, eventEmitter: EventEmitter2);
    attach(botExternalId: string, botId: number): void;
    protected dispatchMessage(botExternalId: string, raw: ZaloRawMessage): Promise<void>;
    protected handleClosed3003(botExternalId: string): Promise<void>;
    protected handleFriendEvent(botId: number, botExternalId: string, event: any): Promise<void>;
    protected handleReaction(botId: number, botExternalId: string, event: any): Promise<void>;
}
