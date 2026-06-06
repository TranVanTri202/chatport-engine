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
import { ReactMessageDto } from './dto/react-message.dto';
import { RecallMessageDto } from './dto/recall-message.dto';
import { ZaloZcaService } from '@/channels/zalo/zalo-zca.service';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DOMAIN_EVENTS } from '@/shared/events/domain-events';


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
    private readonly zaloZca: ZaloZcaService,
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
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
        attachments: [
          {
            url: `data:${file.mimetype};name=${encodeURIComponent(file.originalname)};base64,${file.buffer.toString('base64')}`,
          },
        ],
        quote: body.quoteMessageExternalId ? { messageExternalId: body.quoteMessageExternalId } : undefined,
      }),
    );
  }

  @Post('react')
  async reactMessage(@Body() body: ReactMessageDto) {
    await this.zaloZca.addReaction(
      body.botExternalId,
      body.threadId,
      body.threadType === 'group' ? 1 : 0,
      body.messageExternalId,
      body.reactIcon,
    );
    return { success: true };
  }

  @Post('recall')
  async recallMessage(@Body() body: RecallMessageDto) {
    await this.zaloZca.undo(
      body.botExternalId,
      body.messageExternalId,
      body.threadId,
      body.threadType === 'group' ? 1 : 0,
    );
    return { success: true };
  }

  @Post('pin')
  async pinMessage(@Body() body: PinMessageDto) {
    await this.zaloZca.pinMessage(
      body.botExternalId,
      body.threadId,
      body.messageExternalId,
      true,
    );
    return { success: true };
  }

  @Post('unpin')
  async unpinMessage(@Body() body: UnpinMessageDto) {
    await this.zaloZca.unpinMessage(
      body.botExternalId,
      body.threadId,
      body.topicId,
    );
    return { success: true };
  }
}

export class PinMessageDto {
  @IsString()
  botExternalId: string;

  @IsString()
  threadId: string;

  @IsString()
  threadType: string;

  @IsString()
  messageExternalId: string;
}

export class UnpinMessageDto {
  @IsString()
  botExternalId: string;

  @IsString()
  threadId: string;

  @IsString()
  topicId: string;
}
