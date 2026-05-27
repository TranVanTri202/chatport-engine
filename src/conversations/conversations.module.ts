import { Module } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { MessageService } from './message.service';
import { ConversationsController } from './conversations.controller';

@Module({
  controllers: [ConversationsController],
  providers: [ConversationService, MessageService],
  exports: [ConversationService, MessageService],
})
export class ConversationsModule {}
