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
var LlmService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LlmService = void 0;
const common_1 = require("@nestjs/common");
const openai_1 = require("@langchain/openai");
const messages_1 = require("@langchain/core/messages");
const app_config_1 = require("../shared/config/app.config");
const REQUEST_TIMEOUT_MS = 20_000;
let LlmService = LlmService_1 = class LlmService {
    config;
    logger = new common_1.Logger(LlmService_1.name);
    constructor(config) {
        this.config = config;
    }
    resolve(overrides = {}) {
        const env = this.config.llmDefaults;
        return {
            model: overrides.model ?? env.model,
            temperature: overrides.temperature ?? env.temperature,
            maxTokens: overrides.maxTokens ?? env.maxTokens,
            topP: overrides.topP ?? env.topP,
            frequencyPenalty: overrides.frequencyPenalty ?? env.frequencyPenalty,
            presencePenalty: overrides.presencePenalty ?? env.presencePenalty,
        };
    }
    async chat(input) {
        const settings = this.resolve(input.overrides);
        const chat = new openai_1.ChatOpenAI({
            apiKey: this.config.openAiKey,
            model: settings.model,
            temperature: settings.temperature,
            maxTokens: settings.maxTokens,
            topP: settings.topP,
            frequencyPenalty: settings.frequencyPenalty,
            presencePenalty: settings.presencePenalty,
            timeout: REQUEST_TIMEOUT_MS,
            maxRetries: 1,
        });
        const lcMessages = [
            new messages_1.SystemMessage(input.system),
            ...input.messages.map((m) => m.role === 'assistant' ? new messages_1.AIMessage(m.content) : new messages_1.HumanMessage(m.content)),
        ];
        try {
            const res = await chat.invoke(lcMessages);
            const content = res.content;
            const text = typeof content === 'string'
                ? content
                : Array.isArray(content)
                    ? content
                        .map((part) => (typeof part === 'string' ? part : part.text ?? ''))
                        .join('')
                    : String(content ?? '');
            return text.trim();
        }
        catch (err) {
            this.logger.error(`LangChain chat failed: ${err.message}`);
            throw err;
        }
    }
};
exports.LlmService = LlmService;
exports.LlmService = LlmService = LlmService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [app_config_1.AppConfig])
], LlmService);
//# sourceMappingURL=llm.service.js.map