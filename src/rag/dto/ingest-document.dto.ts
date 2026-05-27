import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class IngestDocumentDto {
  /** Server-injected from JWT — not validated as input. */
  customerId!: number;

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
