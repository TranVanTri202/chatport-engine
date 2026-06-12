import { IsString } from 'class-validator';

export class PinMessageDto {
  @IsString()
  botExternalId!: string;

  @IsString()
  threadId!: string;

  @IsString()
  threadType!: string;

  @IsString()
  messageExternalId!: string;
}
