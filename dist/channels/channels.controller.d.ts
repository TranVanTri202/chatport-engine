import { ChannelRegistry } from './channel-registry.service';
export declare class ChannelsController {
    private readonly registry;
    constructor(registry: ChannelRegistry);
    startLogin(customerId: number, channel: string): Promise<import("./channel-adapter.interface").StartLoginResult>;
    logout(channel: string, botId: string): Promise<{
        ok: boolean;
    }>;
    private parseChannel;
}
