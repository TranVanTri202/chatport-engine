import { Injectable } from '@nestjs/common';
import { Bot, Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { ChannelType } from '@/shared/types';

/**
 * Thin layer over Prisma for Bot persistence ONLY.
 *
 * Why split repo from service:
 *  - Service can be unit-tested by mocking the repo (jest-mock-extended)
 *    without faking Prisma's whole API surface.
 *  - Service file stays focused on business rules.
 *  - Swapping Prisma later (or adding a read replica) touches only this file.
 */
@Injectable()
export class BotRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyByCustomer(customerId: number): Promise<Bot[]> {
    return this.prisma.bot.findMany({
      where: { customerId },
      orderBy: { id: 'desc' },
    });
  }

  /** Bot + aggregated counts for the "show bot" screen. */
  async findByIdDetailed(id: number) {
    return this.prisma.bot.findUnique({
      where: { id },
      include: {
        _count: { select: { conversations: true, documents: true } },
        conversations: {
          orderBy: { lastMessageAt: 'desc' },
          take: 1,
          select: { lastMessageAt: true },
        },
      },
    });
  }

  findById(id: number): Promise<Bot | null> {
    return this.prisma.bot.findUnique({ where: { id } });
  }

  findByExternal(channel: ChannelType, externalId: string): Promise<Bot | null> {
    return this.prisma.bot.findUnique({
      where: { channel_externalId: { channel, externalId } },
    });
  }

  create(data: Prisma.BotUncheckedCreateInput): Promise<Bot> {
    return this.prisma.bot.create({ data });
  }

  update(id: number, data: Prisma.BotUpdateInput): Promise<Bot> {
    return this.prisma.bot.update({ where: { id }, data });
  }

  delete(id: number): Promise<Bot> {
    return this.prisma.bot.delete({ where: { id } });
  }

  countAttachedDocuments(botId: number): Promise<number> {
    return this.prisma.botDocument.count({ where: { botId } });
  }

  listAttachedDocuments(botId: number) {
    return this.prisma.botDocument.findMany({
      where: { botId },
      include: { document: true },
      orderBy: { documentId: 'asc' },
    });
  }

  detachDocument(botId: number, documentId: number) {
    return this.prisma.botDocument.delete({
      where: { botId_documentId: { botId, documentId } },
    });
  }

  /**
   * Idempotent attach. Caller is responsible for the quota check (use
   * `attachDocumentsWithQuota` in a transaction).
   */
  attachDocuments(botId: number, documentIds: number[]) {
    return this.prisma.$transaction(
      documentIds.map((documentId) =>
        this.prisma.botDocument.upsert({
          where: { botId_documentId: { botId, documentId } },
          create: { botId, documentId },
          update: {},
        }),
      ),
    );
  }

  /**
   * Atomic conditional increment of `requestUsed`. Returns the updated row
   * when the bot still has budget, or `null` when the quota was already met.
   *
   * Using raw SQL because Prisma can't express
   *   UPDATE … WHERE requestUsed < requestQuota RETURNING …
   * with `.update()`. Two-step (read + write) leaves a race window where
   * concurrent replies could overshoot the cap.
   */
  async tryConsumeRequest(
    botId: number,
  ): Promise<{ id: number; requestUsed: number; requestQuota: number } | null> {
    const rows = await this.prisma.$queryRaw<
      Array<{ id: number; requestUsed: number; requestQuota: number }>
    >`
      UPDATE "Bot"
         SET "requestUsed" = "requestUsed" + 1, "updatedAt" = NOW()
       WHERE id = ${botId}
         AND "requestUsed" < "requestQuota"
       RETURNING id, "requestUsed", "requestQuota"
    `;
    return rows[0] ?? null;
  }

  /** Reset the trial counter — admin endpoint or future "renew plan" flow. */
  async resetRequestCounter(botId: number): Promise<void> {
    await this.prisma.bot.update({
      where: { id: botId },
      data: { requestUsed: 0 },
    });
  }
}
