import { Module, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { ChannelRegistry } from './channel-registry.service';
import { ChannelsController } from './channels.controller';
import { ChannelCoreModule } from './channel-core.module';
import { ZaloModule } from './zalo/zalo.module';
import { TelegramModule } from './telegram/telegram.module';

@Module({
  imports: [ChannelCoreModule, ZaloModule, TelegramModule],
  controllers: [ChannelsController],
})
export class ChannelsModule implements OnApplicationBootstrap {
  private readonly logger = new Logger(ChannelsModule.name);

  constructor(private readonly registry: ChannelRegistry) {}

  onApplicationBootstrap(): void {
    this.logger.log(`ChannelRegistry registered: [${this.registry.list().join(', ')}]`);
  }
}
