import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ThreadType } from '@/shared/types';

export class SendVoiceFileDto {
  @IsString()
  botExternalId!: string;

  @IsString()
  threadId!: string;

  @IsEnum(ThreadType)
  threadType!: ThreadType;

  @IsOptional()
  @IsString()
  quoteMessageExternalId?: string;
}

export class SendVideoFileDto {
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

export class SendGeneralFileDto {
  @IsString()
  botExternalId!: string;

  @IsString()
  threadId!: string;

  @IsEnum(ThreadType)
  threadType!: ThreadType;

  @IsOptional()
  @IsString()
  quoteMessageExternalId?: string;
}
