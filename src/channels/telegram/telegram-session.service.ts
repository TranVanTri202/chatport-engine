import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';

export interface TelegramSessionPayload {
  botToken: string;
  webhookUrl?: string;
}

@Injectable()
export class TelegramSessionService {
  constructor(private readonly prisma: PrismaService) {}

  async load(botId: number): Promise<TelegramSessionPayload | null> {
    const row = await this.prisma.botSession.findUnique({ where: { botId } });
    return (row?.payload as TelegramSessionPayload | undefined) ?? null;
  }

  async save(botId: number, payload: TelegramSessionPayload): Promise<void> {
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
