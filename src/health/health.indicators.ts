import { Injectable } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { RedisService } from '@/shared/redis/redis.service';

@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async pingCheck(key = 'prisma'): Promise<HealthIndicatorResult> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return this.getStatus(key, true);
    } catch (err) {
      throw new HealthCheckError(
        'Prisma ping failed',
        this.getStatus(key, false, { message: (err as Error).message }),
      );
    }
  }
}

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(private readonly redis: RedisService) {
    super();
  }

  async pingCheck(key = 'redis'): Promise<HealthIndicatorResult> {
    try {
      const pong = await this.redis.raw.ping();
      const ok = pong === 'PONG';
      if (!ok) throw new Error(`Unexpected reply: ${pong}`);
      return this.getStatus(key, true);
    } catch (err) {
      throw new HealthCheckError(
        'Redis ping failed',
        this.getStatus(key, false, { message: (err as Error).message }),
      );
    }
  }
}
