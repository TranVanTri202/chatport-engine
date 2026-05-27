import { Injectable, Logger } from '@nestjs/common';
import { ChannelType } from '@/shared/types';
import { IChannelAdapter } from './channel-adapter.interface';

@Injectable()
export class ChannelRegistry {
  private readonly logger = new Logger(ChannelRegistry.name);
  private readonly map = new Map<ChannelType, IChannelAdapter>();

  register(adapter: IChannelAdapter): void {
    if (this.map.has(adapter.channel)) {
      throw new Error(`Channel adapter already registered: ${adapter.channel}`);
    }
    this.map.set(adapter.channel, adapter);
    this.logger.log(`Registered channel adapter: ${adapter.channel}`);
  }

  get(channel: ChannelType): IChannelAdapter {
    const adapter = this.map.get(channel);
    if (!adapter) throw new Error(`No adapter for channel ${channel}`);
    return adapter;
  }

  list(): ChannelType[] {
    return Array.from(this.map.keys());
  }
}
