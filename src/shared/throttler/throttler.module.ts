import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';

/**
 * Two-tier global rate limit. Short window catches bursts; long window caps
 * sustained abuse. Routes that need different limits use `@Throttle()`.
 */
@Module({
  imports: [
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 20 },
      { name: 'long', ttl: 60_000, limit: 200 },
    ]),
  ],
  exports: [ThrottlerModule],
})
export class AppThrottlerModule {}
