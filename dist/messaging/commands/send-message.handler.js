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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SendMessageHandler = void 0;
const common_1 = require("@nestjs/common");
const cqrs_1 = require("@nestjs/cqrs");
const prisma_service_1 = require("../../shared/prisma/prisma.service");
const messaging_publisher_1 = require("../messaging.publisher");
const outbound_message_mapper_1 = require("../outbound-message.mapper");
const send_message_validation_service_1 = require("../send-message-validation.service");
const send_message_command_1 = require("./send-message.command");
let SendMessageHandler = class SendMessageHandler {
    prisma;
    publisher;
    validator;
    mapper;
    constructor(prisma, publisher, validator, mapper) {
        this.prisma = prisma;
        this.publisher = publisher;
        this.validator = validator;
        this.mapper = mapper;
    }
    async execute(cmd) {
        const { input } = cmd;
        const bot = await this.prisma.bot.findFirst({
            where: { externalId: input.botExternalId },
            select: { id: true, externalId: true, channel: true },
        });
        if (!bot)
            throw new common_1.NotFoundException(`Bot ${input.botExternalId} not found`);
        this.validator.validate(input);
        await this.publisher.publishOutbound(this.mapper.fromSendCommand({ id: bot.id, externalId: bot.externalId, channel: bot.channel }, input));
        return { enqueued: true };
    }
};
exports.SendMessageHandler = SendMessageHandler;
exports.SendMessageHandler = SendMessageHandler = __decorate([
    (0, cqrs_1.CommandHandler)(send_message_command_1.SendMessageCommand),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        messaging_publisher_1.MessagingPublisher,
        send_message_validation_service_1.SendMessageValidationService,
        outbound_message_mapper_1.OutboundMessageMapper])
], SendMessageHandler);
//# sourceMappingURL=send-message.handler.js.map