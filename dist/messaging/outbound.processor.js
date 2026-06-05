"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var OutboundProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutboundProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const bullmq_2 = require("bullmq");
const node_crypto_1 = require("node:crypto");
const channel_registry_service_1 = require("../channels/channel-registry.service");
const conversation_service_1 = require("../conversations/conversation.service");
const message_service_1 = require("../conversations/message.service");
const realtime_gateway_1 = require("../realtime/realtime.gateway");
const prisma_service_1 = require("../shared/prisma/prisma.service");
const redis_service_1 = require("../shared/redis/redis.service");
const channel_errors_1 = require("../shared/errors/channel.errors");
const types_1 = require("../shared/types");
const domain_events_1 = require("../shared/events/domain-events");
const LOCK_TTL_MS = 15_000;
let OutboundProcessor = OutboundProcessor_1 = class OutboundProcessor extends bullmq_1.WorkerHost {
    registry;
    redis;
    conversations;
    messages;
    realtime;
    prisma;
    events;
    logger = new common_1.Logger(OutboundProcessor_1.name);
    constructor(registry, redis, conversations, messages, realtime, prisma, events) {
        super();
        this.registry = registry;
        this.redis = redis;
        this.conversations = conversations;
        this.messages = messages;
        this.realtime = realtime;
        this.prisma = prisma;
        this.events = events;
    }
    async process(job) {
        const msg = job.data;
        const lockKey = `lock:send:${msg.botExternalId}:${msg.threadId}`;
        const token = (0, node_crypto_1.randomUUID)();
        const got = await this.redis.acquireLock(lockKey, token, LOCK_TTL_MS);
        if (!got)
            throw new channel_errors_1.LockedError(lockKey);
        try {
            const adapter = this.registry.get(msg.channel);
            let sendResult;
            try {
                sendResult = await adapter.send(msg.botExternalId, {
                    threadId: msg.threadId,
                    threadType: msg.threadType,
                    type: msg.type,
                    text: msg.text,
                    attachments: msg.attachments,
                    quote: msg.quote,
                });
            }
            catch (err) {
                if (err instanceof channel_errors_1.ChannelExpiredError) {
                    await this.markExpired(msg.botId);
                    return;
                }
                throw err;
            }
        }
        finally {
            await this.redis.releaseLock(lockKey, token);
        }
    }
    async markExpired(botId) {
        const updated = await this.prisma.bot.update({
            where: { id: botId },
            data: { status: types_1.BotStatus.expired },
            select: { id: true, customerId: true, status: true },
        });
        const evt = {
            botId: updated.id,
            customerId: updated.customerId,
            from: types_1.BotStatus.active,
            to: types_1.BotStatus.expired,
            reason: 'channel.expired',
        };
        this.events.emit(domain_events_1.DOMAIN_EVENTS.BotStatusChanged, evt);
        this.logger.warn(`Bot ${botId} marked expired; outbound dropped`);
    }
    onFailed(job, err) {
        this.logger.error(`outbound job ${job.id} (attempts=${job.attemptsMade}) failed: ${err.message}`);
    }
    onStalled(jobId) {
        this.logger.warn(`outbound job ${jobId} stalled`);
    }
};
exports.OutboundProcessor = OutboundProcessor;
__decorate([
    (0, bullmq_1.OnWorkerEvent)('failed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bullmq_2.Job, Error]),
    __metadata("design:returntype", void 0)
], OutboundProcessor.prototype, "onFailed", null);
__decorate([
    (0, bullmq_1.OnWorkerEvent)('stalled'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OutboundProcessor.prototype, "onStalled", null);
exports.OutboundProcessor = OutboundProcessor = OutboundProcessor_1 = __decorate([
    (0, bullmq_1.Processor)(types_1.MESSAGING_OUTBOUND_QUEUE, {
        concurrency: 5,
        limiter: { max: 5, duration: 1000 },
    }),
    __metadata("design:paramtypes", [channel_registry_service_1.ChannelRegistry,
        redis_service_1.RedisService,
        conversation_service_1.ConversationService,
        message_service_1.MessageService,
        realtime_gateway_1.RealtimeGateway,
        prisma_service_1.PrismaService,
        event_emitter_1.EventEmitter2])
], OutboundProcessor);
//# sourceMappingURL=outbound.processor.js.map