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

  async findManyByCustomer(customerId: number) {
    const bots = await this.prisma.bot.findMany({
      where: { customerId },
      include: {
        _count: {
          select: {
            friendRequests: true,
            contacts: { where: { isFriend: true } },
          },
        },
        conversations: {
          select: {
            unread: true,
            metadata: true,
          },
        },
      },
      orderBy: { id: 'desc' },
    });

    return bots.map((bot) => {
      const { conversations, ...rest } = bot;
      const unread = conversations.reduce((sum, c) => {
        const metadata = (c.metadata as Record<string, any>) || {};
        if (metadata.isMuted) return sum;
        return sum + c.unread;
      }, 0);
      return {
        ...rest,
        unread,
      };
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

  getSystemPrompt(botId: number): Promise<string | null> {
    return this.prisma.bot.findUnique({
      where: { id: botId },
      select: { systemPrompt: true },
    }).then((bot) => bot?.systemPrompt ?? null);
  }

  listDocuments(botId: number) {
    return this.prisma.document.findMany({
      where: { botId },
      orderBy: { id: 'desc' },
    });
  }

  detachDocument(botId: number, documentId: number) {
    return this.prisma.document.update({
      where: { id: documentId },
      data: { botId },
    });
  }

  findDocumentsByIds(botId: number, ids: number[]) {
    return this.prisma.document.findMany({
      where: { botId, id: { in: ids } },
      select: { id: true },
    });
  }

  attachDocuments(botId: number, documentIds: number[]) {
    return this.prisma.document.updateMany({
      where: { id: { in: documentIds } },
      data: { botId },
    });
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

  async refundRequest(botId: number): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE "Bot"
         SET "requestUsed" = GREATEST(0, "requestUsed" - 1), "updatedAt" = NOW()
       WHERE id = ${botId}
    `;
  }

  /** Reset the trial counter — admin endpoint or future "renew plan" flow. */
  async resetRequestCounter(botId: number): Promise<void> {
    await this.prisma.bot.update({
      where: { id: botId },
      data: { requestUsed: 0 },
    });
  }

  /** Upsert bot by channel + externalId (used by adapter during login). */
  async upsertByExternal(input: {
    channel: ChannelType;
    externalId: string;
    customerId: number;
    name: string;
    avatar: string | null;
    status: string;
  }): Promise<Bot> {
    return this.prisma.bot.upsert({
      where: {
        channel_externalId: {
          channel: input.channel,
          externalId: input.externalId,
        },
      },
      create: {
        customerId: input.customerId,
        channel: input.channel,
        externalId: input.externalId,
        name: input.name,
        avatar: input.avatar,
        status: input.status as any,
      },
      update: {
        customerId: input.customerId,
        name: input.name,
        avatar: input.avatar,
        status: input.status as any,
      },
    });
  }

  /** Run multiple operations atomically. */
  async transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }
}
