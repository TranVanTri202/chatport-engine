import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { Public } from '@/auth/public.decorator';
import {
  PrismaHealthIndicator,
  RedisHealthIndicator,
} from './health.indicators';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaHealthIndicator,
    private readonly redis: RedisHealthIndicator,
  ) {}

  /** Liveness — process is up. */
  @Public()
  @Get('live')
  live() {
    return { status: 'up' };
  }

  /** Readiness — Prisma + Redis must be reachable. */
  @Public()
  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([
      () => this.prisma.pingCheck(),
      () => this.redis.pingCheck(),
    ]);
  }
}
