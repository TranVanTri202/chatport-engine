import { forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Bot, Prisma } from '@prisma/client';
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

  getSystemPrompt(botId: number): Promise<string | null> {
    return this.repo.getSystemPrompt(botId);
  }

  async updateSystemPrompt(botId: number, systemPrompt: string): Promise<Bot> {
    await this.get(botId);
    return this.repo.update(botId, { systemPrompt });
  }

  create(dto: CreateBotDto): Promise<Bot> {
    const { settings, ...rest } = dto;
    const data = {
      ...(rest as Prisma.BotUncheckedCreateInput),
      ...this.mapSettings(settings),
    } as Prisma.BotUncheckedCreateInput;
    return this.repo.create(data);
  }

  async update(id: number, dto: UpdateBotDto): Promise<Bot> {
    await this.get(id);
    const { settings, ...rest } = dto;
    return this.repo.update(id, { ...rest, ...this.mapSettings(settings) });
  }

  async delete(id: number): Promise<void> {
    await this.repo.delete(id);
  }

  async attachDocuments(botId: number, dto: AttachDocumentsDto): Promise<void> {
    await this.quota.assertCanAttachDocuments(botId, dto.documentIds);
    await this.repo.attachDocuments(botId, dto.documentIds);
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
