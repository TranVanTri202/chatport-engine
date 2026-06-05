import { AppConfig } from '@/shared/config/app.config';
import { LlmCallOverrides, LlmCallSettings } from './llm-settings';
export interface ChatTurn {
    role: 'user' | 'assistant';
    content: string;
}
export interface ChatInput {
    system: string;
    messages: ChatTurn[];
    overrides?: LlmCallOverrides;
}
export declare class LlmService {
    private readonly config;
    private readonly logger;
    constructor(config: AppConfig);
    resolve(overrides?: LlmCallOverrides): LlmCallSettings;
    chat(input: ChatInput): Promise<string>;
}
