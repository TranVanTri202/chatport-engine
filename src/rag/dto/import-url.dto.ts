import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class ImportUrlDto {
  /** Server-injected from route or bot context — not validated as input. */
  botId!: number;

  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;
}

export class UploadDocumentMetaDto {
  /** Server-injected from route or bot context — not validated as input. */
  botId!: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;
}
