import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { ThreadType } from '@/shared/types';

export class RecallMessageDto {
  @ApiProperty()
  @IsString()
  botExternalId!: string;

  @ApiProperty()
  @IsString()
  threadId!: string;

  @ApiProperty({ enum: ThreadType })
  @IsEnum(ThreadType)
  threadType!: ThreadType;

  @ApiProperty()
  @IsString()
  messageExternalId!: string;
}
