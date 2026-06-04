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

class DemoChatDto {
  @IsString()
  botExternalId!: string;

  @IsString()
  sessionId!: string;

  @IsString()
  text!: string;

  @IsOptional()
  @IsEnum(ThreadType)
  threadType?: ThreadType;
}

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

  @Post('demo/chat')
  async demoChat(@Body() body: DemoChatDto) {
    const bot = await this.bots.getByExternal(ChannelType.zalo, body.botExternalId);
    const conversation = await this.conversations.getOrCreateBySession({
      botId: bot.id,
      sessionId: body.sessionId,
      threadType: body.threadType ?? ThreadType.user,
    });

    const inbound: InboundMessageDto = {
      channel: ChannelType.zalo,
      botExternalId: body.botExternalId,
      threadId: body.sessionId,
      threadType: body.threadType ?? ThreadType.user,
      senderExternalId: body.sessionId,
      messageExternalId: `demo-${Date.now()}`,
      timestamp: Date.now(),
      type: 'chat',
      text: body.text,
      attachments: [],
      isSelf: false,
    };

    await this.messages.persistInbound({
      conversationId: conversation.id,
      direction: MessageDirection.in,
      msg: inbound,
    });

    const systemPrompt = bot.systemPrompt?.trim();
    if (!systemPrompt) {
      throw new BadRequestException('Bot system prompt is required');
    }

    const history = await this.messages.lastN(conversation.id, this.config.conversationHistoryLimit);
    const contexts = await this.retrieval.search(bot.id, body.text, bot.ragTopK ?? this.config.ragTopKDefault);
    const reply = await this.llm.chat({
      system: systemPrompt,
      messages: history.map((m) => ({
        role: m.direction === 'out' ? 'assistant' : 'user',
        content: m.text ?? '',
      })),
      overrides: {
        model: bot.llmModel ?? undefined,
        temperature: bot.temperature ?? undefined,
        maxTokens: bot.maxTokens ?? undefined,
        topP: bot.topP ?? undefined,
        frequencyPenalty: bot.frequencyPenalty ?? undefined,
        presencePenalty: bot.presencePenalty ?? undefined,
      },
    });

    const outbound = await this.messages.persistOutbound({
      conversationId: conversation.id,
      direction: MessageDirection.out,
      text: reply,
      attachments: [],
      messageExternalId: null,
      senderExternalId: bot.externalId,
    });

    return {
      bot,
      conversation,
      reply,
      documents: contexts,
      message: outbound,
    };
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
