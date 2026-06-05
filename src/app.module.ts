import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerGuard } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import { ConfigModule } from '@/shared/config/config.module';
import { PrismaModule } from '@/shared/prisma/prisma.module';
import { RedisModule } from '@/shared/redis/redis.module';
import { AppConfig } from '@/shared/config/app.config';
import { EventsModule } from '@/shared/events/events.module';
import { AppClsModule } from '@/shared/context/cls.module';
import { AppThrottlerModule } from '@/shared/throttler/throttler.module';
import { GlobalExceptionFilter } from '@/shared/filters/global-exception.filter';
import { LoggingInterceptor } from '@/shared/interceptors/logging.interceptor';
import { ResponseTransformInterceptor } from '@/shared/interceptors/response-transform.interceptor';

import { LlmModule } from '@/llm/llm.module';
import { RagModule } from '@/rag/rag.module';
import { ConversationsModule } from '@/conversations/conversations.module';
import { MessagingModule } from '@/messaging/messaging.module';
import { ChannelsModule } from '@/channels/channels.module';
import { BotModule } from '@/bot/bot.module';
import { RealtimeModule } from '@/realtime/realtime.module';
import { AuthModule } from '@/auth/auth.module';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { HealthModule } from '@/health/health.module';
import { QuotaModule } from '@/quota/quota.module';
import { ContactsModule } from '@/contacts/contacts.module';

@Module({
  imports: [
    // ── Infrastructure ──────────────────────────────────────────────
    ConfigModule,
    AppClsModule,
    EventsModule,
    AppThrottlerModule,
    LoggerModule.forRootAsync({
      inject: [AppConfig],
      useFactory: (cfg: AppConfig) => ({
        pinoHttp: {
          level: cfg.logLevel,
          autoLogging: false,
          customProps: () => ({}),
          transport:
            cfg.nodeEnv === 'development'
              ? {
                  target: 'pino-pretty',
                  options: {
                    singleLine: true,
                    translateTime: 'SYS:standard',
                    ignore: 'pid,hostname',
                  },
                }
              : undefined,
          serializers: {
            req(req) {
              return {
                id: req.id,
                method: req.method,
                url: req.url,
                remoteAddress:
                  req.socket?.remoteAddress ?? req.remoteAddress ?? '-',
              };
            },
            res(res) {
              return {
                statusCode: res.statusCode,
              };
            },
          },
        },
      }),
    }),
    PrismaModule,
    RedisModule,
    BullModule.forRootAsync({
      inject: [AppConfig],
      useFactory: (cfg: AppConfig) => ({
        connection: { url: cfg.redisUrl },
      }),
    }),

    // ── Domain (per plan §15 bootstrap order) ───────────────────────
    LlmModule,
    RagModule,
    ConversationsModule,
    QuotaModule,
    MessagingModule,
    ChannelsModule,
    BotModule,
    RealtimeModule,
    AuthModule,
    HealthModule,
    ContactsModule,
  ],
  providers: [
    // Order matters: throttler → auth. Filter + interceptor are globals.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ResponseTransformInterceptor },
  ],
})
export class AppModule {}
