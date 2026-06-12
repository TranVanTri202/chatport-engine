import { IsString } from 'class-validator';

export class ForwardMessageDto {
  @IsString()
  botExternalId!: string;

  @IsString()
  messageExternalId!: string;

  @IsString()
  targetThreadId!: string;

  @IsString()
  targetThreadType!: 'user' | 'group';
}
