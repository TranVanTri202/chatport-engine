"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const bullmq_1 = require("@nestjs/bullmq");
const throttler_1 = require("@nestjs/throttler");
const nestjs_pino_1 = require("nestjs-pino");
const config_module_1 = require("./shared/config/config.module");
const prisma_module_1 = require("./shared/prisma/prisma.module");
const redis_module_1 = require("./shared/redis/redis.module");
const app_config_1 = require("./shared/config/app.config");
const events_module_1 = require("./shared/events/events.module");
const cls_module_1 = require("./shared/context/cls.module");
const throttler_module_1 = require("./shared/throttler/throttler.module");
const global_exception_filter_1 = require("./shared/filters/global-exception.filter");
const logging_interceptor_1 = require("./shared/interceptors/logging.interceptor");
const response_transform_interceptor_1 = require("./shared/interceptors/response-transform.interceptor");
const llm_module_1 = require("./llm/llm.module");
const rag_module_1 = require("./rag/rag.module");
const conversations_module_1 = require("./conversations/conversations.module");
const messaging_module_1 = require("./messaging/messaging.module");
const channels_module_1 = require("./channels/channels.module");
const bot_module_1 = require("./bot/bot.module");
const realtime_module_1 = require("./realtime/realtime.module");
const auth_module_1 = require("./auth/auth.module");
const jwt_auth_guard_1 = require("./auth/jwt-auth.guard");
const health_module_1 = require("./health/health.module");
const quota_module_1 = require("./quota/quota.module");
const contacts_module_1 = require("./contacts/contacts.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_module_1.ConfigModule,
            cls_module_1.AppClsModule,
            events_module_1.EventsModule,
            throttler_module_1.AppThrottlerModule,
            nestjs_pino_1.LoggerModule.forRootAsync({
                inject: [app_config_1.AppConfig],
                useFactory: (cfg) => ({
                    pinoHttp: {
                        level: cfg.logLevel,
                        autoLogging: false,
                        customProps: () => ({}),
                        transport: cfg.nodeEnv === 'development'
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
                                    remoteAddress: req.socket?.remoteAddress ?? req.remoteAddress ?? '-',
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
            prisma_module_1.PrismaModule,
            redis_module_1.RedisModule,
            bullmq_1.BullModule.forRootAsync({
                inject: [app_config_1.AppConfig],
                useFactory: (cfg) => ({
                    connection: { url: cfg.redisUrl },
                }),
            }),
            llm_module_1.LlmModule,
            rag_module_1.RagModule,
            conversations_module_1.ConversationsModule,
            quota_module_1.QuotaModule,
            messaging_module_1.MessagingModule,
            channels_module_1.ChannelsModule,
            bot_module_1.BotModule,
            realtime_module_1.RealtimeModule,
            auth_module_1.AuthModule,
            health_module_1.HealthModule,
            contacts_module_1.ContactsModule,
        ],
        providers: [
            { provide: core_1.APP_GUARD, useClass: throttler_1.ThrottlerGuard },
            { provide: core_1.APP_GUARD, useClass: jwt_auth_guard_1.JwtAuthGuard },
            { provide: core_1.APP_FILTER, useClass: global_exception_filter_1.GlobalExceptionFilter },
            { provide: core_1.APP_INTERCEPTOR, useClass: logging_interceptor_1.LoggingInterceptor },
            { provide: core_1.APP_INTERCEPTOR, useClass: response_transform_interceptor_1.ResponseTransformInterceptor },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map