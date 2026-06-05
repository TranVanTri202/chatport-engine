"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppConfig = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let AppConfig = class AppConfig {
    cs;
    constructor(cs) {
        this.cs = cs;
    }
    get nodeEnv() {
        return this.cs.getOrThrow('NODE_ENV');
    }
    get port() {
        return Number(this.cs.getOrThrow('PORT'));
    }
    get databaseUrl() {
        return this.cs.getOrThrow('DATABASE_URL');
    }
    get redisUrl() {
        return this.cs.getOrThrow('REDIS_URL');
    }
    get openAiKey() {
        return this.cs.getOrThrow('OPENAI_API_KEY');
    }
    get firebaseProjectId() {
        return this.cs.getOrThrow('FIREBASE_PROJECT_ID');
    }
    get firebaseServiceAccountJson() {
        return this.cs.get('FIREBASE_SERVICE_ACCOUNT_JSON');
    }
    get firebaseClientEmail() {
        return this.cs.get('FIREBASE_CLIENT_EMAIL');
    }
    get firebasePrivateKey() {
        return this.cs.get('FIREBASE_PRIVATE_KEY');
    }
    get llmDefaults() {
        return {
            model: this.cs.getOrThrow('LLM_MODEL'),
            temperature: Number(this.cs.getOrThrow('LLM_TEMPERATURE')),
            maxTokens: Number(this.cs.getOrThrow('LLM_MAX_TOKENS')),
            topP: Number(this.cs.getOrThrow('LLM_TOP_P')),
            frequencyPenalty: Number(this.cs.getOrThrow('LLM_FREQUENCY_PENALTY')),
            presencePenalty: Number(this.cs.getOrThrow('LLM_PRESENCE_PENALTY')),
        };
    }
    get ragTopKDefault() {
        return Number(this.cs.getOrThrow('RAG_TOP_K'));
    }
    get conversationHistoryLimit() {
        return Number(this.cs.get('CONVERSATION_HISTORY_LIMIT') ?? 40);
    }
    get conversationRecentLimit() {
        return Number(this.cs.get('CONVERSATION_RECENT_LIMIT') ?? 15);
    }
    get conversationSummaryTriggerLimit() {
        return Number(this.cs.get('CONVERSATION_SUMMARY_TRIGGER_LIMIT') ?? 10);
    }
    get conversationSummaryMaxChars() {
        return Number(this.cs.get('CONVERSATION_SUMMARY_MAX_CHARS') ?? 1200);
    }
    get embeddingModel() {
        return this.cs.getOrThrow('EMBEDDING_MODEL');
    }
    get embeddingDims() {
        return Number(this.cs.getOrThrow('EMBEDDING_DIMS'));
    }
    get jwtSecret() {
        return this.cs.getOrThrow('JWT_SECRET');
    }
    get jwtExpiresIn() {
        return this.cs.getOrThrow('JWT_EXPIRES_IN');
    }
    get jwtRefreshExpiresInDays() {
        return Number(this.cs.getOrThrow('JWT_REFRESH_EXPIRES_IN_DAYS'));
    }
    get socketCorsOrigin() {
        return this.cs.getOrThrow('SOCKET_CORS_ORIGIN');
    }
    get logLevel() {
        return this.cs.getOrThrow('LOG_LEVEL');
    }
};
exports.AppConfig = AppConfig;
exports.AppConfig = AppConfig = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AppConfig);
//# sourceMappingURL=app.config.js.map