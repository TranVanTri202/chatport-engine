import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ThreadType } from '@/shared/types';

export class SendTextMessageDto {
  @IsString()
  botExternalId!: string;

  @IsString()
  threadId!: string;

  @IsEnum(ThreadType)
  threadType!: ThreadType;

  @IsString()
  text!: string;

  @IsOptional()
  @IsString()
  quoteMessageExternalId?: string;
}
