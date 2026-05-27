import { Module } from '@nestjs/common';
import { TelegramAdapter } from './telegram.adapter';

@Module({
  providers: [TelegramAdapter],
  exports: [TelegramAdapter],
})
export class TelegramModule {}
