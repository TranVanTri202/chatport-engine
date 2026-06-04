import { Injectable } from '@nestjs/common';
import { ChannelType } from '@/shared/types';
import { OutboundMessageDto } from './dto/outbound-message.dto';
import { SendMessageCommand } from './commands/send-message.command';

@Injectable()
export class OutboundMessageMapper {
  fromSendCommand(bot: { id: number; externalId: string; channel: string }, input: SendMessageCommand['input']): OutboundMessageDto {
    return {
      botId: bot.id,
      channel: bot.channel as ChannelType,
      botExternalId: bot.externalId,
      threadId: input.threadId,
      threadType: input.threadType,
      type: input.type,
      text: input.text,
      attachments: input.attachments,
      quote: input.quote,
    };
  }
}
