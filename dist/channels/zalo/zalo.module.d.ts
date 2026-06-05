import { OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { ZaloAdapter } from './zalo.adapter';
export declare class ZaloModule implements OnApplicationBootstrap {
    private readonly prisma;
    private readonly adapter;
    private readonly logger;
    constructor(prisma: PrismaService, adapter: ZaloAdapter);
    onApplicationBootstrap(): Promise<void>;
}
