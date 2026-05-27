import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class ImportUrlDto {
  /** Server-injected from JWT — not validated as input. */
  customerId!: number;

  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;
}

export class UploadDocumentMetaDto {
  /** Server-injected from JWT — not validated as input. */
  customerId!: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;
}
