import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { OmitType } from '@nestjs/swagger';
import { ChannelType } from '@/shared/types';

/**
 * Per-bot LLM + RAG knobs. Every field is optional — null means "fall back
 * to env default". Bounds mirror `env.validation.ts` so settings stay valid
 * regardless of whether they came from env or API.
 */
export class BotSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  llmModel?: string;

  @IsOptional()
  @Min(0)
  @Max(2)
  temperature?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8192)
  maxTokens?: number;

  @IsOptional()
  @Min(0)
  @Max(1)
  topP?: number;

  @IsOptional()
  @Min(-2)
  @Max(2)
  frequencyPenalty?: number;

  @IsOptional()
  @Min(-2)
  @Max(2)
  presencePenalty?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  ragTopK?: number;

  /** Forward-compat: free-form bag stored in `Bot.settings` JSON column. */
  @IsOptional()
  @IsObject()
  extra?: Record<string, unknown>;
}

export class CreateBotDto {
  /** Server-injected from JWT — not validated as input. */
  customerId!: number;

  @IsEnum(ChannelType)
  channel!: ChannelType;

  @IsString()
  @MaxLength(120)
  externalId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  systemPrompt?: string;

  @IsOptional()
  @Min(0)
  @Max(2)
  temperature?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => BotSettingsDto)
  settings?: BotSettingsDto;
}

export class UpdateBotDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  systemPrompt?: string;

  @IsOptional()
  @Min(0)
  @Max(2)
  temperature?: number;

  @IsOptional()
  @IsBoolean()
  autoReplyEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  activeHours?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fallbackReplies?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  llmModel?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => BotSettingsDto)
  settings?: BotSettingsDto;
}

export class CreateBotBodyDto extends OmitType(CreateBotDto, [
  'customerId',
] as const) {}

export class UpdateTemperatureDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature!: number;
}

export class UpdateSystemPromptDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(20000)
  systemPrompt!: string;
}
