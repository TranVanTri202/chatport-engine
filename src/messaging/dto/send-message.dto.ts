import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { MessageType, ThreadType } from '@/shared/types';
import { OutboundAttachmentDto } from './outbound-attachment.dto';

export class SendMessageDto {
  @IsString()
  botExternalId!: string;

  @IsString()
  threadId!: string;

  @IsEnum(ThreadType)
  threadType!: ThreadType;

  @IsEnum(MessageType)
  type!: MessageType;

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
