import { Module, forwardRef } from '@nestjs/common';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';
import { ContactsRepository } from './repositories/contacts.repository';
import { BotModule } from '@/bot/bot.module';
import { ZaloModule } from '@/channels/zalo/zalo.module';
import { ConversationsModule } from '@/conversations/conversations.module';

@Module({
  imports: [
    forwardRef(() => BotModule),
    forwardRef(() => ZaloModule),
    forwardRef(() => ConversationsModule),
  ],
  controllers: [ContactsController],
  providers: [ContactsService, ContactsRepository],
  exports: [ContactsService, ContactsRepository],
})
export class ContactsModule {}
