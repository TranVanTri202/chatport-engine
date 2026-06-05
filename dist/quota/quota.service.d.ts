import { BotRepository } from '@/bot/repositories/bot.repository';
import { PrismaService } from '@/shared/prisma/prisma.service';
export declare class QuotaService {
    private readonly bots;
    private readonly prisma;
    constructor(bots: BotRepository, prisma: PrismaService);
    consumeRequest(botId: number): Promise<void>;
    refundRequest(botId: number): Promise<void>;
    assertCanAttachDocuments(botId: number, newDocIds: number[]): Promise<void>;
    summary(botId: number): Promise<{
        request: {
            used: number;
            limit: number;
            remaining: number;
        };
        document: {
            used: number;
            limit: number;
            remaining: number;
        };
    }>;
}
