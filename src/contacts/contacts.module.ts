import { Module } from '@nestjs/common';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';
import { BotModule } from '@/bot/bot.module';
import { ZaloModule } from '@/channels/zalo/zalo.module';

@Module({
  imports: [BotModule, ZaloModule],
  controllers: [ContactsController],
  providers: [ContactsService],
  exports: [ContactsService],
})
export class ContactsModule {}
