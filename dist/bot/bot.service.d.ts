import { Bot } from '@prisma/client';
import { ChannelType } from '@/shared/types';
import { QuotaService } from '@/quota/quota.service';
import { BotRepository } from './repositories/bot.repository';
import { CreateBotDto, UpdateBotDto } from './dto/create-bot.dto';
export interface BotWithUsage {
    bot: Bot;
    counts: {
        conversations: number;
        documents: number;
    };
    quota: {
        request: {
            used: number;
            limit: number;
            remaining: number;
        };
        document: {
            used: number;
            limit: number;
            remaining: number;
        };
    };
    lastMessageAt: Date | null;
}
export declare class BotService {
    private readonly repo;
    private readonly quota;
    constructor(repo: BotRepository, quota: QuotaService);
    list(customerId: number): Promise<any[]>;
    get(id: number): Promise<Bot>;
    getDetailed(id: number): Promise<BotWithUsage>;
    getByExternal(channel: ChannelType, externalId: string): Promise<Bot>;
    getSystemPrompt(channel: ChannelType, externalId: string): Promise<string | null>;
    updateSystemPrompt(channel: ChannelType, externalId: string, systemPrompt: string): Promise<Bot>;
    create(dto: CreateBotDto): Promise<Bot>;
    update(id: number, dto: UpdateBotDto): Promise<Bot>;
    delete(id: number): Promise<void>;
    attachDocuments(channel: ChannelType, externalId: string, dto: {
        documentIds: number[];
    }): Promise<void>;
    private mapSettings;
}
