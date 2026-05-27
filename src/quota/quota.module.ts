import { forwardRef, Module } from '@nestjs/common';
import { BotModule } from '@/bot/bot.module';
import { QuotaService } from './quota.service';

@Module({
  imports: [forwardRef(() => BotModule)],
  providers: [QuotaService],
  exports: [QuotaService],
})
export class QuotaModule {}
