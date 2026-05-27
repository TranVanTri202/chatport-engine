import { Body, Controller, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ThreadType } from '@/shared/types';
import { SendMessageCommand } from './commands/send-message.command';

class OutboundAttachmentDto {
  @IsString()
  url!: string;
  @IsOptional()
  @IsString()
  caption?: string;
}

class SendMessageDto {
  @IsInt()
  @IsPositive()
  botId!: number;

  @IsString()
  threadId!: string;

  @IsEnum(ThreadType)
  threadType!: ThreadType;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => OutboundAttachmentDto)
  attachments?: OutboundAttachmentDto[];
}

@ApiTags('messages')
@ApiBearerAuth('jwt')
@Controller('messages')
export class MessagesController {
  constructor(private readonly commands: CommandBus) {}

  @Post('send')
  send(@Body() body: SendMessageDto) {
    return this.commands.execute(
      new SendMessageCommand({
        botId: body.botId,
        threadId: body.threadId,
        threadType: body.threadType,
        text: body.text,
        attachments: body.attachments,
      }),
    );
  }
}
