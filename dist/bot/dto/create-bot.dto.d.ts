import { ChannelType } from '@/shared/types';
export declare class BotSettingsDto {
    llmModel?: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    ragTopK?: number;
    extra?: Record<string, unknown>;
}
export declare class CreateBotDto {
    customerId: number;
    channel: ChannelType;
    externalId: string;
    name?: string;
    systemPrompt?: string;
    temperature?: number;
    settings?: BotSettingsDto;
}
export declare class UpdateBotDto {
    name?: string;
    systemPrompt?: string;
    temperature?: number;
    autoReplyEnabled?: boolean;
    activeHours?: string;
    fallbackReplies?: string[];
    llmModel?: string;
    settings?: BotSettingsDto;
}
declare const CreateBotBodyDto_base: import("@nestjs/common").Type<Omit<CreateBotDto, "customerId">>;
export declare class CreateBotBodyDto extends CreateBotBodyDto_base {
}
export declare class UpdateTemperatureDto {
    temperature: number;
}
export declare class UpdateSystemPromptDto {
    systemPrompt: string;
}
export {};
