import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { LlmCallSettings } from '@/llm/llm-settings';

@Injectable()
export class AppConfig {
  constructor(private readonly cs: ConfigService) {}

  get nodeEnv(): string {
    return this.cs.getOrThrow<string>('NODE_ENV');
  }

  get port(): number {
    return Number(this.cs.getOrThrow<number>('PORT'));
  }

  get databaseUrl(): string {
    return this.cs.getOrThrow<string>('DATABASE_URL');
  }

  get redisUrl(): string {
    return this.cs.getOrThrow<string>('REDIS_URL');
  }

  get openAiKey(): string {
    return this.cs.getOrThrow<string>('OPENAI_API_KEY');
  }

  /** Default per-call LLM settings — Bot rows override these field-by-field. */
  get llmDefaults(): LlmCallSettings {
    return {
      model: this.cs.getOrThrow<string>('LLM_MODEL'),
      temperature: Number(this.cs.getOrThrow<number>('LLM_TEMPERATURE')),
      maxTokens: Number(this.cs.getOrThrow<number>('LLM_MAX_TOKENS')),
      topP: Number(this.cs.getOrThrow<number>('LLM_TOP_P')),
      frequencyPenalty: Number(this.cs.getOrThrow<number>('LLM_FREQUENCY_PENALTY')),
      presencePenalty: Number(this.cs.getOrThrow<number>('LLM_PRESENCE_PENALTY')),
    };
  }

  get ragTopKDefault(): number {
    return Number(this.cs.getOrThrow<number>('RAG_TOP_K'));
  }

  get embeddingModel(): string {
    return this.cs.getOrThrow<string>('EMBEDDING_MODEL');
  }

  get embeddingDims(): number {
    return Number(this.cs.getOrThrow<number>('EMBEDDING_DIMS'));
  }

  get jwtSecret(): string {
    return this.cs.getOrThrow<string>('JWT_SECRET');
  }

  get jwtExpiresIn(): string {
    return this.cs.getOrThrow<string>('JWT_EXPIRES_IN');
  }

  get socketCorsOrigin(): string {
    return this.cs.getOrThrow<string>('SOCKET_CORS_ORIGIN');
  }

  get logLevel(): string {
    return this.cs.getOrThrow<string>('LOG_LEVEL');
  }
}
