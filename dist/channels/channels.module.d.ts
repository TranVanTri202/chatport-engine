import { OnApplicationBootstrap } from '@nestjs/common';
import { ChannelRegistry } from './channel-registry.service';
export declare class ChannelsModule implements OnApplicationBootstrap {
    private readonly registry;
    private readonly logger;
    constructor(registry: ChannelRegistry);
    onApplicationBootstrap(): void;
}
