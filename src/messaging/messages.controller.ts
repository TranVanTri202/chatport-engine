import { BadRequestException, Body, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SendMessageCommand } from './commands/send-message.command';
import { SendTextMessageDto } from './dto/send-text-message.dto';
import { SendImageFileDto } from './dto/send-image-file.dto';
import { InboundMessageDto } from './dto/inbound-message.dto';
import { ChannelType, MessageDirection, MessageType, ThreadType } from '@/shared/types';
import { BotService } from '@/bot/bot.service';
import { ConversationService } from '@/conversations/conversation.service';
import { MessageService } from '@/conversations/message.service';
import { RetrievalService } from '@/rag/retrieval.service';
import { LlmService } from '@/llm/llm.service';
import { AppConfig } from '@/shared/config/app.config';
import { BotResponseService } from '@/bot/bot-response.service';


@ApiTags('messages')
@ApiBearerAuth('jwt')
@Controller('messages')
export class MessagesController {
  constructor(
    private readonly commands: CommandBus,
    private readonly bots: BotService,
    private readonly conversations: ConversationService,
    private readonly messages: MessageService,
    private readonly retrieval: RetrievalService,
    private readonly llm: LlmService,
    private readonly config: AppConfig,
    private readonly botResponse: BotResponseService,
  ) {}

  @Post('send/text')
  sendText(@Body() body: SendTextMessageDto) {
    return this.commands.execute(
      new SendMessageCommand({
        botExternalId: body.botExternalId,
        threadId: body.threadId,
        threadType: body.threadType,
        type: MessageType.chat,
        text: body.text,
        quote: body.quoteMessageExternalId ? { messageExternalId: body.quoteMessageExternalId } : undefined,
      }),
    );
  }


  @Post('send/image')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['botExternalId', 'threadId', 'threadType', 'file'],
      properties: {
        botExternalId: { type: 'string' },
        threadId: { type: 'string' },
        threadType: { type: 'string', enum: ['user', 'group'] },
        caption: { type: 'string' },
        quoteMessageExternalId: { type: 'string' },
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  sendImage(
    @Body() body: SendImageFileDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('file is required');
    return this.commands.execute(
      new SendMessageCommand({
        botExternalId: body.botExternalId,
        threadId: body.threadId,
        threadType: body.threadType,
        type: MessageType.image,
        text: body.caption,
        attachments: [{ url: `buffer:${file.originalname}` }],
        quote: body.quoteMessageExternalId ? { messageExternalId: body.quoteMessageExternalId } : undefined,
      }),
    );
  }
}
