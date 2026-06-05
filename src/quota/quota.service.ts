import { Injectable, NotFoundException } from '@nestjs/common';
import { BotRepository } from '@/bot/repositories/bot.repository';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { QuotaExceededError } from '@/shared/errors/quota.errors';

/**
 * Single source of truth for bot trial limits.
 *
 *  - `consumeRequest(botId)`: atomic +1 on `requestUsed`, throws if quota met.
 *    Use BEFORE any work that should count toward the cap (auto-reply,
 *    explicit send, etc.). Cheaper to fail fast than to do an LLM call
 *    and *then* discover we shouldn't have.
 *
 *  - `assertCanAttachDocuments(botId, newDocIds)`: counts only NEW pairs
 *    (existing BotDocument rows are idempotent attaches, don't consume).
 *
 *  - `summary(botId)`: read-only for UI.
 */
@Injectable()
export class QuotaService {
  constructor(
    private readonly bots: BotRepository,
    private readonly prisma: PrismaService,
  ) {}

  async consumeRequest(botId: number): Promise<void> {
    const updated = await this.bots.tryConsumeRequest(botId);
    if (updated) return;

    // Either bot doesn't exist or quota maxed — disambiguate for a clearer
    // error to the caller.
    const bot = await this.bots.findById(botId);
    if (!bot) throw new NotFoundException(`Bot ${botId} not found`);
    throw new QuotaExceededError(
      'request',
      botId,
      bot.requestUsed,
      bot.requestQuota,
    );
  }

  async refundRequest(botId: number): Promise<void> {
    await this.bots.refundRequest(botId);
  }

  async assertCanAttachDocuments(
    botId: number,
    newDocIds: number[],
  ): Promise<void> {
    if (newDocIds.length === 0) return;

    const bot = await this.bots.findById(botId);
    if (!bot) throw new NotFoundException(`Bot ${botId} not found`);

    // Filter out IDs already attached — those are no-op updates, not consumption.
    const existing = await this.prisma.document.findMany({
      where: { botId, id: { in: newDocIds } },
      select: { id: true },
    });
    const existingSet = new Set(existing.map((e) => e.id));
    const trulyNew = newDocIds.filter((id) => !existingSet.has(id));
    if (trulyNew.length === 0) return;

    const currentCount = await this.bots.listDocuments(botId).then((docs) => docs.length);
    const projected = currentCount + trulyNew.length;
    if (projected > bot.documentQuota) {
      throw new QuotaExceededError(
        'document',
        botId,
        currentCount,
        bot.documentQuota,
      );
    }
  }

  async summary(botId: number) {
    const bot = await this.bots.findById(botId);
    if (!bot) throw new NotFoundException(`Bot ${botId} not found`);
    const docCount = await this.bots.listDocuments(botId).then((docs) => docs.length);
    return {
      request: {
        used: bot.requestUsed,
        limit: bot.requestQuota,
        remaining: Math.max(0, bot.requestQuota - bot.requestUsed),
      },
      document: {
        used: docCount,
        limit: bot.documentQuota,
        remaining: Math.max(0, bot.documentQuota - docCount),
      },
    };
  }
}
