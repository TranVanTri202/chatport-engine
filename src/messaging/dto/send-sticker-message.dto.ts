import { IsEnum, IsNumber, IsObject, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ThreadType } from '@/shared/types';

export class StickerDataDto {
  @IsNumber()
  sticker_id!: number;

  @IsNumber()
  cat_id!: number;

  @IsNumber()
  sticker_type!: number;

  @IsString()
  url!: string;
}

export class SendStickerMessageDto {
  @IsString()
  botExternalId!: string;

  @IsString()
  threadId!: string;

  @IsEnum(ThreadType)
  threadType!: ThreadType;

  @IsObject()
  @ValidateNested()
  @Type(() => StickerDataDto)
  sticker!: StickerDataDto;
}
