/**
 * Resolved per-call LLM settings for a single chat invocation.
 * All knobs the API exposes on a Bot live here; defaults are filled in by
 * `LlmService.resolve()` from env when a bot leaves a field null.
 */
export interface LlmCallSettings {
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
}

/**
 * Same fields as `LlmCallSettings` but every key is optional — used as
 * (a) the shape stored on `Bot` (Prisma columns), and
 * (b) the per-call override accepted by `LlmService.chat()`.
 */
export type LlmCallOverrides = Partial<LlmCallSettings>;
