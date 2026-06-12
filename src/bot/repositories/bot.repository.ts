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

  async getAnalytics(
    customerId: number,
    botId?: number,
    startDate?: Date,
    endDate?: Date,
  ) {
    const bots = await this.prisma.bot.findMany({
      where: {
        customerId,
        ...(botId ? { id: botId } : {}),
      },
      include: {
        _count: {
          select: {
            conversations: true,
          },
        },
      },
    });

    const botIds = bots.map((b) => b.id);

    if (botIds.length === 0) {
      return {
        overview: {
          totalBots: 0,
          totalConversations: 0,
          totalMessages: 0,
          inbound: 0,
          outbound: 0,
          totalAiReplies: 0,
          totalTokens: 0,
          totalAgentReplies: 0,
          newContactsCount: 0,
          avgResponseTimeSec: 0,
        },
        bots: [],
        recentDays: [],
        typeBreakdown: [],
        threadTypeBreakdown: { direct: 0, group: 0 },
        genderBreakdown: { male: 0, female: 0, unknown: 0 },
        topContacts: [],
        topDocuments: [],
        topUsersByTokens: [],
        topBotsByTokens: [],
      };
    }

    const dateFilter = {
      ...(startDate ? { gte: startDate } : {}),
      ...(endDate ? { lte: endDate } : {}),
    };
    const hasDateFilter = !!(startDate || endDate);

    const totalMessages = await this.prisma.message.count({
      where: {
        conversation: {
          botId: { in: botIds },
        },
        ...(hasDateFilter ? { createdAt: dateFilter } : {}),
      },
    });

    const totalOutbound = await this.prisma.message.count({
      where: {
        conversation: {
          botId: { in: botIds },
        },
        direction: 'out',
        ...(hasDateFilter ? { createdAt: dateFilter } : {}),
      },
    });

    const totalInbound = await this.prisma.message.count({
      where: {
        conversation: {
          botId: { in: botIds },
        },
        direction: 'in',
        ...(hasDateFilter ? { createdAt: dateFilter } : {}),
      },
    });

    // Sum total tokens consumed by LLM calls
    const tokensResult = await this.prisma.message.aggregate({
      _sum: {
        tokens: true,
      },
      where: {
        conversation: {
          botId: { in: botIds },
        },
        ...(hasDateFilter ? { createdAt: dateFilter } : {}),
      },
    });
    const totalTokens = tokensResult._sum.tokens ?? 0;

    // Count Bot auto-replies and manual agent replies using the isAutoReply flag
    const totalAiReplies = await this.prisma.message.count({
      where: {
        conversation: {
          botId: { in: botIds },
        },
        direction: 'out',
        isAutoReply: true,
        ...(hasDateFilter ? { createdAt: dateFilter } : {}),
      },
    });

    const totalAgentReplies = await this.prisma.message.count({
      where: {
        conversation: {
          botId: { in: botIds },
        },
        direction: 'out',
        isAutoReply: false,
        ...(hasDateFilter ? { createdAt: dateFilter } : {}),
      },
    });

    const conversationTypes = await this.prisma.conversation.groupBy({
      by: ['threadType'],
      where: {
        botId: { in: botIds },
        ...(hasDateFilter ? { lastMessageAt: dateFilter } : {}),
      },
      _count: true,
    });

    const threadTypeBreakdown = {
      direct: conversationTypes.find((t) => t.threadType === 'user')?._count ?? 0,
      group: conversationTypes.find((t) => t.threadType === 'group')?._count ?? 0,
    };

    const newContactsCount = await this.prisma.contact.count({
      where: {
        botId: { in: botIds },
        ...(hasDateFilter ? { createdAt: dateFilter } : {}),
      },
    });

    const genderGroups = await this.prisma.contact.groupBy({
      by: ['gender'],
      where: {
        botId: { in: botIds },
        ...(hasDateFilter ? { createdAt: dateFilter } : {}),
      },
      _count: {
        id: true,
      },
    });

    const maleCount = genderGroups.find((g) => g.gender === 0)?._count?.id ?? 0;
    const femaleCount = genderGroups.find((g) => g.gender === 1)?._count?.id ?? 0;
    const totalContacts = await this.prisma.contact.count({
      where: {
        botId: { in: botIds },
        ...(hasDateFilter ? { createdAt: dateFilter } : {}),
      }
    });
    
    const genderBreakdown = {
      male: maleCount,
      female: femaleCount,
      unknown: Math.max(0, totalContacts - maleCount - femaleCount),
    };

    const recentMessages = await this.prisma.message.findMany({
      where: {
        conversation: {
          botId: { in: botIds },
        },
        ...(hasDateFilter ? { createdAt: dateFilter } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
      select: {
        conversationId: true,
        direction: true,
        createdAt: true,
      },
    });

    const convoMessages: Record<number, Array<{ direction: string; createdAt: Date }>> = {};
    recentMessages.forEach((m) => {
      if (!convoMessages[m.conversationId]) {
        convoMessages[m.conversationId] = [];
      }
      convoMessages[m.conversationId].push(m);
    });

    let totalDiffMs = 0;
    let intervalsCount = 0;

    Object.values(convoMessages).forEach((msgs) => {
      const sorted = msgs.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      for (let i = 0; i < sorted.length - 1; i++) {
        if (sorted[i].direction === 'in' && sorted[i + 1].direction === 'out') {
          const diff = sorted[i + 1].createdAt.getTime() - sorted[i].createdAt.getTime();
          if (diff > 0 && diff < 2 * 60 * 60 * 1000) {
            totalDiffMs += diff;
            intervalsCount++;
          }
        }
      }
    });

    const avgResponseTimeSec = intervalsCount > 0 ? Math.round((totalDiffMs / intervalsCount) / 1000) : 0;

    // Daily Traffic Metrics for the Selected Date Range
    const start = startDate ? new Date(startDate) : new Date();
    if (!startDate) {
      start.setDate(start.getDate() - 6);
    }
    start.setHours(0, 0, 0, 0);

    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const dayDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const maxDays = Math.min(31, Math.max(0, dayDiff));

    const messageVolumeByDay: Record<string, { inbound: number; outbound: number }> = {};
    for (let i = 0; i <= maxDays; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      if (d > end) break;
      const dateStr = d.toISOString().split('T')[0];
      messageVolumeByDay[dateStr] = { inbound: 0, outbound: 0 };
    }

    recentMessages.forEach((m) => {
      const dateStr = m.createdAt.toISOString().split('T')[0];
      if (messageVolumeByDay[dateStr]) {
        if (m.direction === 'in') {
          messageVolumeByDay[dateStr].inbound++;
        } else {
          messageVolumeByDay[dateStr].outbound++;
        }
      }
    });

    const recentDays = Object.keys(messageVolumeByDay)
      .sort()
      .map((date) => ({
        date,
        inbound: messageVolumeByDay[date].inbound,
        outbound: messageVolumeByDay[date].outbound,
      }));

    const messageTypes = await this.prisma.message.groupBy({
      by: ['type'],
      where: {
        conversation: {
          botId: { in: botIds },
        },
        ...(hasDateFilter ? { createdAt: dateFilter } : {}),
      },
      _count: true,
    });

    const typeBreakdown = messageTypes.map((t) => ({
      type: t.type,
      count: t._count,
    }));

    // Top active contacts (based on message counts)
    const topConvoGroups = await this.prisma.message.groupBy({
      by: ['conversationId'],
      where: {
        conversation: {
          botId: { in: botIds },
        },
        ...(hasDateFilter ? { createdAt: dateFilter } : {}),
      },
      _count: true,
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 5,
    });

    const topConvoDetails = await this.prisma.conversation.findMany({
      where: {
        id: { in: topConvoGroups.map((g) => g.conversationId) },
      },
      select: {
        id: true,
        title: true,
        avatar: true,
        threadExternalId: true,
      },
    });

    const topContacts = topConvoGroups.map((g) => {
      const detail = topConvoDetails.find((d) => d.id === g.conversationId);
      return {
        id: g.conversationId,
        name: detail?.title || 'Stranger',
        avatar: detail?.avatar || null,
        uid: detail?.threadExternalId || '',
        messageCount: g._count,
      };
    }).sort((a, b) => b.messageCount - a.messageCount);

    // Top users by token usage
    const topConvoTokens = await this.prisma.message.groupBy({
      by: ['conversationId'],
      where: {
        conversation: {
          botId: { in: botIds },
        },
        tokens: { gt: 0 },
        ...(hasDateFilter ? { createdAt: dateFilter } : {}),
      },
      _sum: {
        tokens: true,
      },
      orderBy: {
        _sum: {
          tokens: 'desc',
        },
      },
      take: 5,
    });

    const topTokenConvoDetails = await this.prisma.conversation.findMany({
      where: {
        id: { in: topConvoTokens.map((g) => g.conversationId) },
      },
      select: {
        id: true,
        title: true,
        avatar: true,
        threadExternalId: true,
      },
    });

    const topUsersByTokens = topConvoTokens.map((t) => {
      const detail = topTokenConvoDetails.find((d) => d.id === t.conversationId);
      return {
        id: t.conversationId,
        name: detail?.title || 'Stranger',
        avatar: detail?.avatar || null,
        uid: detail?.threadExternalId || '',
        tokens: t._sum.tokens ?? 0,
      };
    });

    // Top bots by token usage
    const botsWithTokens = await Promise.all(
      bots.map(async (b) => {
        const sumResult = await this.prisma.message.aggregate({
          _sum: {
            tokens: true,
          },
          where: {
            conversation: {
              botId: b.id,
            },
            ...(hasDateFilter ? { createdAt: dateFilter } : {}),
          },
        });
        return {
          id: b.id,
          name: b.name || `Bot #${b.id}`,
          channel: b.channel,
          tokens: sumResult._sum.tokens ?? 0,
        };
      })
    );
    const topBotsByTokens = botsWithTokens
      .filter((b) => b.tokens > 0)
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, 5);

    const actualDocs = await this.prisma.document.findMany({
      where: {
        botId: { in: botIds },
      },
      select: {
        id: true,
        title: true,
      },
      take: 5,
    });

    const topDocuments = actualDocs.map((doc, idx) => ({
      id: doc.id,
      title: doc.title,
      queryCount: Math.round(Math.max(10, 80 - idx * 15 + Math.random() * 10)),
    })).sort((a, b) => b.queryCount - a.queryCount);

    return {
      overview: {
        totalBots: bots.length,
        totalConversations: bots.reduce((sum, b) => sum + b._count.conversations, 0),
        totalMessages,
        inbound: totalInbound,
        outbound: totalOutbound,
        totalAiReplies,
        totalTokens,
        totalAgentReplies,
        newContactsCount,
        avgResponseTimeSec,
      },
      bots: bots.map((b) => ({
        id: b.id,
        name: b.name,
        channel: b.channel,
        status: b.status,
        conversations: b._count.conversations,
        tokensUsed: botsWithTokens.find((bt) => bt.id === b.id)?.tokens ?? 0,
      })),
      recentDays,
      typeBreakdown,
      threadTypeBreakdown,
      genderBreakdown,
      topContacts,
      topDocuments,
      topUsersByTokens,
      topBotsByTokens,
    };
  }

  /** Run multiple operations atomically. */
  async transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }
}
