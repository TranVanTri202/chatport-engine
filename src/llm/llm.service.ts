import { Injectable, Logger } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from '@langchain/core/messages';
import { AppConfig } from '@/shared/config/app.config';
import { LlmCallOverrides, LlmCallSettings } from './llm-settings';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatInput {
  system: string;
  messages: ChatTurn[];
  /** Per-call overrides — typically the bot's own settings. */
  overrides?: LlmCallOverrides;
}

const REQUEST_TIMEOUT_MS = 20_000;

/**
 * LangChain ChatOpenAI wrapper.
 *
 * Settings are resolved per-call: `resolve()` merges caller overrides over
 * env defaults, so every Bot can carry its own model/temperature/etc. and we
 * never bake values into the service.
 */
@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  constructor(private readonly config: AppConfig) {}

  /** Resolve final settings: caller overrides > env defaults. */
  resolve(overrides: LlmCallOverrides = {}): LlmCallSettings {
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

  async chat(input: ChatInput): Promise<string> {
    const settings = this.resolve(input.overrides);
    const chat = new ChatOpenAI({
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
      new SystemMessage(input.system),
      ...input.messages.map((m) =>
        m.role === 'assistant' ? new AIMessage(m.content) : new HumanMessage(m.content),
      ),
    ];

    try {
      const res = await chat.invoke(lcMessages);
      const content = res.content;
      const text =
        typeof content === 'string'
          ? content
          : Array.isArray(content)
            ? content
                .map((part) => (typeof part === 'string' ? part : (part as { text?: string }).text ?? ''))
                .join('')
            : String(content ?? '');
      return text.trim();
    } catch (err) {
      this.logger.error(`LangChain chat failed: ${(err as Error).message}`);
      throw err;
    }
  }
}
