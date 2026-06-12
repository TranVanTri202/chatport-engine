import { Injectable } from '@nestjs/common';
import { BotSessionRepository } from '@/shared/prisma/bot-session.repository';

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
  constructor(private readonly repo: BotSessionRepository) {}

  async load(botId: number): Promise<ZaloSessionPayload | null> {
    const payload = await this.repo.loadPayload(botId);
    return (payload as ZaloSessionPayload | undefined) ?? null;
  }

  async save(botId: number, payload: ZaloSessionPayload): Promise<void> {
    await this.repo.savePayload(botId, payload);
  }

  async clear(botId: number): Promise<void> {
    await this.repo.clear(botId);
  }
}
