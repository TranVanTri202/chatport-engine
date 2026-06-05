import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { OmitType } from '@nestjs/swagger';

export class ImportUrlDto {
  /** Server-injected from route or bot context — not validated as input. */
  channel!: string;
  externalId!: string;

  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;
}

export class UploadDocumentMetaDto {
  /** Server-injected from route or bot context — not validated as input. */
  channel!: string;
  externalId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;
}

export class ImportUrlBodyDto extends OmitType(ImportUrlDto, [
  'channel',
  'externalId',
] as const) {}

export class UploadDocumentMetaBodyDto extends OmitType(UploadDocumentMetaDto, [
  'channel',
  'externalId',
] as const) {}
