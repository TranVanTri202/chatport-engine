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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingPublisher = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const bullmq_2 = require("bullmq");
const types_1 = require("../shared/types");
let MessagingPublisher = class MessagingPublisher {
    inbound;
    outbound;
    constructor(inbound, outbound) {
        this.inbound = inbound;
        this.outbound = outbound;
    }
    async publishInbound(msg) {
        const jobId = `${msg.channel}:${msg.botExternalId}:${msg.messageExternalId}`;
        await this.inbound.add('inbound', msg, {
            jobId,
            removeOnComplete: 1000,
            removeOnFail: 5000,
        });
    }
    async publishOutbound(msg) {
        await this.outbound.add('outbound', msg, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: 1000,
            removeOnFail: 5000,
        });
    }
};
exports.MessagingPublisher = MessagingPublisher;
exports.MessagingPublisher = MessagingPublisher = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bullmq_1.InjectQueue)(types_1.MESSAGING_INBOUND_QUEUE)),
    __param(1, (0, bullmq_1.InjectQueue)(types_1.MESSAGING_OUTBOUND_QUEUE)),
    __metadata("design:paramtypes", [bullmq_2.Queue,
        bullmq_2.Queue])
], MessagingPublisher);
//# sourceMappingURL=messaging.publisher.js.map