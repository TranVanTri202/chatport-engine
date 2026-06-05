import { PrismaService } from '@/shared/prisma/prisma.service';
export interface TelegramSessionPayload {
    botToken: string;
    webhookUrl?: string;
}
export declare class TelegramSessionService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    load(botId: number): Promise<TelegramSessionPayload | null>;
    save(botId: number, payload: TelegramSessionPayload): Promise<void>;
    clear(botId: number): Promise<void>;
}
