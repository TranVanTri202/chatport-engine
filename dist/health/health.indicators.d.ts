import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { RedisService } from '@/shared/redis/redis.service';
export declare class PrismaHealthIndicator extends HealthIndicator {
    private readonly prisma;
    constructor(prisma: PrismaService);
    pingCheck(key?: string): Promise<HealthIndicatorResult>;
}
export declare class RedisHealthIndicator extends HealthIndicator {
    private readonly redis;
    constructor(redis: RedisService);
    pingCheck(key?: string): Promise<HealthIndicatorResult>;
}
