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
var InboundProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InboundProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const bullmq_2 = require("bullmq");
const types_1 = require("../shared/types");
const message_handler_1 = require("./message.handler");
let InboundProcessor = InboundProcessor_1 = class InboundProcessor extends bullmq_1.WorkerHost {
    handler;
    logger = new common_1.Logger(InboundProcessor_1.name);
    constructor(handler) {
        super();
        this.handler = handler;
    }
    async process(job) {
        await this.handler.handle(job.data);
    }
    onFailed(job, err) {
        this.logger.error(`inbound job ${job.id} (attempts=${job.attemptsMade}) failed: ${err.message}`, err.stack);
    }
};
exports.InboundProcessor = InboundProcessor;
__decorate([
    (0, bullmq_1.OnWorkerEvent)('failed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bullmq_2.Job, Error]),
    __metadata("design:returntype", void 0)
], InboundProcessor.prototype, "onFailed", null);
exports.InboundProcessor = InboundProcessor = InboundProcessor_1 = __decorate([
    (0, bullmq_1.Processor)(types_1.MESSAGING_INBOUND_QUEUE, { concurrency: 10 }),
    __metadata("design:paramtypes", [message_handler_1.MessageHandler])
], InboundProcessor);
//# sourceMappingURL=inbound.processor.js.map