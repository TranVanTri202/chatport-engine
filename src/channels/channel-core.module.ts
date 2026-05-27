import { Global, Module } from '@nestjs/common';
import { ChannelRegistry } from './channel-registry.service';

/**
 * Global module so any adapter module (Zalo, Telegram, …) can inject the
 * shared ChannelRegistry without import cycles via ChannelsModule.
 */
@Global()
@Module({
  providers: [ChannelRegistry],
  exports: [ChannelRegistry],
})
export class ChannelCoreModule {}
