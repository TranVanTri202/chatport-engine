import { IsOptional, IsString } from 'class-validator';

export class OutboundAttachmentDto {
  @IsString()
  url!: string;

  @IsOptional()
  @IsString()
  caption?: string;
}
