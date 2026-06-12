import { Injectable } from '@nestjs/common';
import { BotSessionRepository } from '@/shared/prisma/bot-session.repository';

export interface TelegramSessionPayload {
  botToken: string;
  webhookUrl?: string;
}

@Injectable()
export class TelegramSessionService {
  constructor(private readonly repo: BotSessionRepository) {}

  async load(botId: number): Promise<TelegramSessionPayload | null> {
    const payload = await this.repo.loadPayload(botId);
    return (payload as TelegramSessionPayload | undefined) ?? null;
  }

  async save(botId: number, payload: TelegramSessionPayload): Promise<void> {
    await this.repo.savePayload(botId, payload);
  }

  async clear(botId: number): Promise<void> {
    await this.repo.clear(botId);
  }
}
