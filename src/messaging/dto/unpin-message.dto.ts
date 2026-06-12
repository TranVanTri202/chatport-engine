import { IsString } from 'class-validator';

export class UnpinMessageDto {
  @IsString()
  botExternalId!: string;

  @IsString()
  threadId!: string;

  @IsString()
  topicId!: string;
}
