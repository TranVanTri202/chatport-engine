import { Module } from '@nestjs/common';
import { MessagingModule } from '@/messaging/messaging.module';
import { TelegramAdapter } from './telegram.adapter';
import { TelegramController } from './telegram.controller';
import { TelegramListeners } from './telegram.listeners';
import { TelegramSessionService } from './telegram-session.service';

@Module({
  imports: [MessagingModule],
  controllers: [TelegramController],
  providers: [TelegramAdapter, TelegramListeners, TelegramSessionService],
  exports: [TelegramAdapter],
})
export class TelegramModule {}
