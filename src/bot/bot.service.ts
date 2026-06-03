import { forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Bot, Prisma } from '@prisma/client';
import { ChannelType } from '@/shared/types';
import { QuotaService } from '@/quota/quota.service';
import { BotRepository } from './repositories/bot.repository';
import { BotSettingsDto, CreateBotDto, UpdateBotDto } from './dto/create-bot.dto';

export interface BotWithUsage {
  bot: Bot;
  counts: {
    conversations: number;
    documents: number;
  };
  quota: {
    request: { used: number; limit: number; remaining: number };
    document: { used: number; limit: number; remaining: number };
  };
  lastMessageAt: Date | null;
}

@Injectable()
export class BotService {
  constructor(
    private readonly repo: BotRepository,
    @Inject(forwardRef(() => QuotaService))
    private readonly quota: QuotaService,
  ) {}

  list(customerId: number): Promise<Bot[]> {
    return this.repo.findManyByCustomer(customerId);
  }

  async get(id: number): Promise<Bot> {
    const bot = await this.repo.findById(id);
    if (!bot) throw new NotFoundException(`Bot ${id} not found`);
    return bot;
  }

  /** Enriched view for the "show bot" screen — counts + quota usage. */
  async getDetailed(id: number): Promise<BotWithUsage> {
    const row = await this.repo.findByIdDetailed(id);
    if (!row) throw new NotFoundException(`Bot ${id} not found`);
    const quota = await this.quota.summary(id);
    const { _count, conversations, ...bot } = row;
    return {
      bot: bot as Bot,
      counts: {
        conversations: _count.conversations,
        documents: _count.documents,
      },
      quota,
      lastMessageAt: conversations[0]?.lastMessageAt ?? null,
    };
  }

  async getByExternal(channel: ChannelType, externalId: string): Promise<Bot> {
    const bot = await this.repo.findByExternal(channel, externalId);
    if (!bot) throw new NotFoundException(`Bot ${channel}:${externalId} not found`);
    return bot;
  }

  getSystemPrompt(channel: ChannelType, externalId: string): Promise<string | null> {
    return this.getByExternal(channel, externalId).then((bot) => bot.systemPrompt ?? null);
  }

  async updateSystemPrompt(channel: ChannelType, externalId: string, systemPrompt: string): Promise<Bot> {
    const bot = await this.getByExternal(channel, externalId);
    return this.repo.update(bot.id, { systemPrompt });
  }

  create(dto: CreateBotDto): Promise<Bot> {
    const { settings, temperature, ...rest } = dto;
    const data = {
      ...(rest as Prisma.BotUncheckedCreateInput),
      temperature: temperature ?? 0.5,
      ...this.mapSettings(settings),
    } as Prisma.BotUncheckedCreateInput;
    return this.repo.create(data);
  }

  async update(id: number, dto: UpdateBotDto): Promise<Bot> {
    await this.get(id);
    const { settings, temperature, ...rest } = dto;
    return this.repo.update(id, {
      ...rest,
      ...(temperature !== undefined ? { temperature } : {}),
      ...this.mapSettings(settings),
    });
  }

  async delete(id: number): Promise<void> {
    await this.repo.delete(id);
  }

  async attachDocuments(channel: ChannelType, externalId: string, dto: { documentIds: number[] }): Promise<void> {
    const bot = await this.getByExternal(channel, externalId);
    await this.quota.assertCanAttachDocuments(bot.id, dto.documentIds);
    await this.repo.attachDocuments(bot.id, dto.documentIds);
  }

  private mapSettings(s?: BotSettingsDto): Prisma.BotUpdateInput {
    if (!s) return {};
    const out: Prisma.BotUpdateInput = {};
    if (s.llmModel !== undefined) out.llmModel = s.llmModel;
    if (s.temperature !== undefined) out.temperature = s.temperature;
    if (s.maxTokens !== undefined) out.maxTokens = s.maxTokens;
    if (s.topP !== undefined) out.topP = s.topP;
    if (s.frequencyPenalty !== undefined) out.frequencyPenalty = s.frequencyPenalty;
    if (s.presencePenalty !== undefined) out.presencePenalty = s.presencePenalty;
    if (s.ragTopK !== undefined) out.ragTopK = s.ragTopK;
    if (s.extra !== undefined) out.settings = s.extra as Prisma.InputJsonValue;
    return out;
  }
}
