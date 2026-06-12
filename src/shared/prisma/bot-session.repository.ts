import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Persist bot session payloads (cookie/imei/token) for channel adapters.
 * Shared by ZaloSessionService and TelegramSessionService.
 */
@Injectable()
export class BotSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async loadPayload(botId: number): Promise<unknown | null> {
    const row = await this.prisma.botSession.findUnique({ where: { botId } });
    return row?.payload ?? null;
  }

  async savePayload(botId: number, payload: unknown): Promise<void> {
    await this.prisma.botSession.upsert({
      where: { botId },
      create: { botId, payload: payload as object },
      update: { payload: payload as object },
    });
  }

  async clear(botId: number): Promise<void> {
    await this.prisma.botSession.deleteMany({ where: { botId } });
  }
}
