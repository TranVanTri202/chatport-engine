import { Module, forwardRef } from '@nestjs/common';
import { ZaloModule } from '@/channels/zalo/zalo.module';
import { ConversationService } from './conversation.service';
import { MessageService } from './message.service';
import { ConversationsController } from './conversations.controller';
import { ConversationRepository } from './repositories/conversation.repository';
import { MessageRepository } from './repositories/message.repository';

@Module({
  imports: [forwardRef(() => ZaloModule)],
  controllers: [ConversationsController],
  providers: [ConversationService, MessageService, ConversationRepository, MessageRepository],
  exports: [ConversationService, MessageService, ConversationRepository, MessageRepository],
})
export class ConversationsModule {}
