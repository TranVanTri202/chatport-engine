import { Module, OnApplicationBootstrap, Logger, forwardRef } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { MessagingModule } from '@/messaging/messaging.module';
import { ZaloAdapter } from './zalo.adapter';
import { ZaloController } from './zalo.controller';
import { ZaloInstanceRegistry } from './zalo-instance.registry';
import { ZaloSessionService } from './zalo-session.service';
import { ZaloNormalizer } from './zalo.normalizer';
import { ZaloListeners } from './zalo.listeners';

@Module({
  imports: [forwardRef(() => MessagingModule)],
  controllers: [ZaloController],
  providers: [
    ZaloAdapter,
    ZaloInstanceRegistry,
    ZaloSessionService,
    ZaloNormalizer,
    ZaloListeners,
  ],
  exports: [ZaloAdapter],
})
export class ZaloModule implements OnApplicationBootstrap {
  private readonly logger = new Logger(ZaloModule.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly adapter: ZaloAdapter,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const bots = await this.prisma.bot.findMany({
      where: { channel: 'zalo', status: { in: ['active', 'expired'] } },
    });
    for (const bot of bots) {
      try {
        await this.adapter.restore(bot.id);
      } catch (err) {
        this.logger.error(`restore failed for bot ${bot.id}: ${(err as Error).message}`);
      }
    }
  }
}
