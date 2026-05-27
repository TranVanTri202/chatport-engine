import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';

export interface ZaloSessionPayload {
  cookie: unknown;
  imei: string;
  userAgent: string;
}

/**
 * Persist Zalo BotSession.payload (`cookie/imei/userAgent`) to Prisma.
 * Adapter-private.
 */
@Injectable()
export class ZaloSessionService {
  constructor(private readonly prisma: PrismaService) {}

  async load(botId: number): Promise<ZaloSessionPayload | null> {
    const row = await this.prisma.botSession.findUnique({ where: { botId } });
    return (row?.payload as ZaloSessionPayload | undefined) ?? null;
  }

  async save(botId: number, payload: ZaloSessionPayload): Promise<void> {
    await this.prisma.botSession.upsert({
      where: { botId },
      create: { botId, payload: payload as unknown as object },
      update: { payload: payload as unknown as object },
    });
  }

  async clear(botId: number): Promise<void> {
    await this.prisma.botSession.deleteMany({ where: { botId } });
  }
}
