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
var RealtimeGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealtimeGateway = void 0;
const common_1 = require("@nestjs/common");
const websockets_1 = require("@nestjs/websockets");
const jwt_1 = require("@nestjs/jwt");
const socket_io_1 = require("socket.io");
const prisma_service_1 = require("../shared/prisma/prisma.service");
const app_config_1 = require("../shared/config/app.config");
const types_1 = require("../shared/types");
let RealtimeGateway = RealtimeGateway_1 = class RealtimeGateway {
    jwt;
    config;
    prisma;
    logger = new common_1.Logger(RealtimeGateway_1.name);
    server;
    constructor(jwt, config, prisma) {
        this.jwt = jwt;
        this.config = config;
        this.prisma = prisma;
    }
    afterInit() {
        const engine = this.server?.engine;
        if (engine?.opts) {
            engine.opts.cors = {
                origin: this.config.socketCorsOrigin,
                credentials: true,
            };
        }
    }
    async handleConnection(socket) {
        try {
            const token = socket.handshake.auth?.token ??
                socket.handshake.headers.authorization?.replace(/^Bearer /, '');
            if (!token)
                throw new common_1.UnauthorizedException();
            const payload = await this.jwt.verifyAsync(token, {
                secret: this.config.jwtSecret,
            });
            socket.data.customerId = payload.customerId;
            socket.join(`customer:${payload.customerId}`);
            this.logger.debug(`socket ${socket.id} joined customer:${payload.customerId}`);
        }
        catch (err) {
            this.logger.warn(`socket ${socket.id} auth failed: ${err.message}`);
            socket.disconnect(true);
        }
    }
    handleDisconnect(socket) {
        this.logger.debug(`socket ${socket.id} disconnected`);
    }
    async subscribeSession(socket, payload) {
        if (!payload?.sessionId)
            return;
        await socket.join(`session:${payload.sessionId}`);
    }
    emitToCustomer(customerId, event, data) {
        this.server.to(`customer:${customerId}`).emit(event, data);
    }
    toSession(sessionId, event, data) {
        this.server.to(`session:${sessionId}`).emit(event, data);
    }
    async emitToBot(botId, event, data) {
        const bot = await this.prisma.bot.findUnique({
            where: { id: botId },
            select: { customerId: true },
        });
        if (!bot)
            return;
        this.emitToCustomer(bot.customerId, event, { botId, ...data });
    }
};
exports.RealtimeGateway = RealtimeGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], RealtimeGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('session:subscribe'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], RealtimeGateway.prototype, "subscribeSession", null);
exports.RealtimeGateway = RealtimeGateway = RealtimeGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        namespace: types_1.REALTIME_NAMESPACE,
        cors: { origin: '*', credentials: true },
    }),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        app_config_1.AppConfig,
        prisma_service_1.PrismaService])
], RealtimeGateway);
//# sourceMappingURL=realtime.gateway.js.map