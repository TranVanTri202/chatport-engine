export interface LlmCallSettings {
    model: string;
    temperature: number;
    maxTokens: number;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
}
export type LlmCallOverrides = Partial<LlmCallSettings>;
