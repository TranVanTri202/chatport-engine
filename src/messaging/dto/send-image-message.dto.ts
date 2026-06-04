import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ThreadType } from '@/shared/types';

export class SendImageMessageDto {
  @IsString()
  botExternalId!: string;

  @IsString()
  threadId!: string;

  @IsEnum(ThreadType)
  threadType!: ThreadType;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsString()
  quoteMessageExternalId?: string;
}
