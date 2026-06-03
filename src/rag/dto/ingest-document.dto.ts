import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class IngestDocumentDto {
  /** Server-injected from route or bot context — not validated as input. */
  channel!: string;
  externalId!: string;

  @IsString()
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(1)
  rawText!: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;
}
