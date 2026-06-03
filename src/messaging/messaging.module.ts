import { BullModule } from '@nestjs/bullmq';
import { forwardRef, Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import {
  MESSAGING_INBOUND_QUEUE,
  MESSAGING_OUTBOUND_QUEUE,
} from '@/shared/types';
import { ConversationsModule } from '@/conversations/conversations.module';
import { RealtimeModule } from '@/realtime/realtime.module';
import { BotModule } from '@/bot/bot.module';
import { QuotaModule } from '@/quota/quota.module';
import { MessagingPublisher } from './messaging.publisher';
import { MessageHandler } from './message.handler';
import { ReplyPolicyService } from './reply-policy.service';
import { InboundProcessor } from './inbound.processor';
import { OutboundProcessor } from './outbound.processor';
import { MessagesController } from './messages.controller';
import { SendMessageHandler } from './commands/send-message.handler';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: MESSAGING_INBOUND_QUEUE },
      { name: MESSAGING_OUTBOUND_QUEUE },
    ),
    CqrsModule,
    forwardRef(() => ConversationsModule),
    RealtimeModule,
    forwardRef(() => BotModule),
    QuotaModule,
  ],
  controllers: [MessagesController],
  providers: [
    MessagingPublisher,
    MessageHandler,
    ReplyPolicyService,
    InboundProcessor,
    OutboundProcessor,
    SendMessageHandler,
  ],
  exports: [
    MessagingPublisher,
    ReplyPolicyService,
    BullModule,
  ],
})
export class MessagingModule {}
