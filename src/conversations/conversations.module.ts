import { Module, forwardRef } from '@nestjs/common';
import { ZaloModule } from '@/channels/zalo/zalo.module';
import { ConversationService } from './conversation.service';
import { MessageService } from './message.service';
import { ConversationsController } from './conversations.controller';

@Module({
  imports: [forwardRef(() => ZaloModule)],
  controllers: [ConversationsController],
  providers: [ConversationService, MessageService],
  exports: [ConversationService, MessageService],
})
export class ConversationsModule {}
