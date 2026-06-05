import { HealthCheckService } from '@nestjs/terminus';
import { PrismaHealthIndicator, RedisHealthIndicator } from './health.indicators';
export declare class HealthController {
    private readonly health;
    private readonly prisma;
    private readonly redis;
    constructor(health: HealthCheckService, prisma: PrismaHealthIndicator, redis: RedisHealthIndicator);
    live(): {
        status: string;
    };
    ready(): Promise<import("@nestjs/terminus").HealthCheckResult>;
}
