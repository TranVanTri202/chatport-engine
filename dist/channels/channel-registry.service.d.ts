import { ChannelType } from '@/shared/types';
import { IChannelAdapter } from './channel-adapter.interface';
export declare class ChannelRegistry {
    private readonly logger;
    private readonly map;
    register(adapter: IChannelAdapter): void;
    get(channel: ChannelType): IChannelAdapter;
    list(): ChannelType[];
}
