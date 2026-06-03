import { forwardRef, Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { BotController } from './bot.controller';
import { BotResponseService } from './bot-response.service';
import { BotRepository } from './repositories/bot.repository';
import { ConversationsModule } from '@/conversations/conversations.module';
import { RagModule } from '@/rag/rag.module';
import { LlmModule } from '@/llm/llm.module';
import { MessagingModule } from '@/messaging/messaging.module';
import { QuotaModule } from '@/quota/quota.module';

@Module({
  imports: [
    forwardRef(() => ConversationsModule),
    forwardRef(() => RagModule),
    LlmModule,
    forwardRef(() => MessagingModule),
    forwardRef(() => QuotaModule),
  ],
  controllers: [BotController],
  providers: [BotService, BotResponseService, BotRepository],
  exports: [BotService, BotResponseService, BotRepository],
})
export class BotModule {}
