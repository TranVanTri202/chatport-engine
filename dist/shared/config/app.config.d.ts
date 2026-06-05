import { ConfigService } from '@nestjs/config';
import type { LlmCallSettings } from '@/llm/llm-settings';
export declare class AppConfig {
    private readonly cs;
    constructor(cs: ConfigService);
    get nodeEnv(): string;
    get port(): number;
    get databaseUrl(): string;
    get redisUrl(): string;
    get openAiKey(): string;
    get firebaseProjectId(): string;
    get firebaseServiceAccountJson(): string | undefined;
    get firebaseClientEmail(): string | undefined;
    get firebasePrivateKey(): string | undefined;
    get llmDefaults(): LlmCallSettings;
    get ragTopKDefault(): number;
    get conversationHistoryLimit(): number;
    get conversationRecentLimit(): number;
    get conversationSummaryTriggerLimit(): number;
    get conversationSummaryMaxChars(): number;
    get embeddingModel(): string;
    get embeddingDims(): number;
    get jwtSecret(): string;
    get jwtExpiresIn(): string;
    get jwtRefreshExpiresInDays(): number;
    get socketCorsOrigin(): string;
    get logLevel(): string;
}
