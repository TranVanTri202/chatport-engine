import { PrismaService } from '@/shared/prisma/prisma.service';
export interface ZaloSessionPayload {
    cookie: unknown;
    imei: string;
    userAgent: string;
}
export declare class ZaloSessionService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    load(botId: number): Promise<ZaloSessionPayload | null>;
    save(botId: number, payload: ZaloSessionPayload): Promise<void>;
    clear(botId: number): Promise<void>;
}
