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
var GlobalExceptionFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const client_1 = require("@prisma/client");
const node_crypto_1 = require("node:crypto");
const channel_errors_1 = require("../errors/channel.errors");
const quota_errors_1 = require("../errors/quota.errors");
let GlobalExceptionFilter = GlobalExceptionFilter_1 = class GlobalExceptionFilter {
    adapterHost;
    logger = new common_1.Logger(GlobalExceptionFilter_1.name);
    constructor(adapterHost) {
        this.adapterHost = adapterHost;
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const req = ctx.getRequest();
        const res = ctx.getResponse();
        const requestId = req?.id ?? (0, node_crypto_1.randomUUID)();
        const { status, body } = this.map(exception, requestId);
        if (status >= 500) {
            this.logger.error(`${req?.method} ${req?.url} → ${status} (${body.errorCode}) ${body.message}`, exception?.stack);
        }
        else {
            this.logger.warn(`${req?.method} ${req?.url} → ${status} (${body.errorCode}) ${body.message}`);
        }
        this.adapterHost.httpAdapter.reply(res, body, status);
    }
    map(exception, requestId) {
        if (exception instanceof common_1.HttpException) {
            const status = exception.getStatus();
            const response = exception.getResponse();
            const message = typeof response === 'string'
                ? response
                : (response.message ??
                    exception.message);
            return {
                status,
                body: this.body(status, requestId, this.codeFromStatus(status), Array.isArray(message) ? message.join('; ') : message),
            };
        }
        if (exception instanceof quota_errors_1.QuotaExceededError) {
            return {
                status: common_1.HttpStatus.PAYMENT_REQUIRED,
                body: {
                    code: common_1.HttpStatus.PAYMENT_REQUIRED,
                    message: exception.message,
                    data: null,
                    requestId,
                    errorCode: `QUOTA_${exception.kind.toUpperCase()}_EXCEEDED`,
                    detail: {
                        kind: exception.kind,
                        botId: exception.botId,
                        used: exception.used,
                        limit: exception.limit,
                    },
                },
            };
        }
        if (exception instanceof channel_errors_1.ChannelExpiredError) {
            return {
                status: common_1.HttpStatus.SERVICE_UNAVAILABLE,
                body: this.body(common_1.HttpStatus.SERVICE_UNAVAILABLE, requestId, 'CHANNEL_EXPIRED', exception.message),
            };
        }
        if (exception instanceof channel_errors_1.ChannelOfflineError) {
            return {
                status: common_1.HttpStatus.SERVICE_UNAVAILABLE,
                body: this.body(common_1.HttpStatus.SERVICE_UNAVAILABLE, requestId, 'CHANNEL_OFFLINE', exception.message),
            };
        }
        if (exception instanceof channel_errors_1.ChannelRateLimitedError) {
            return {
                status: common_1.HttpStatus.TOO_MANY_REQUESTS,
                body: this.body(common_1.HttpStatus.TOO_MANY_REQUESTS, requestId, 'CHANNEL_RATE_LIMITED', exception.message),
            };
        }
        if (exception instanceof channel_errors_1.ChannelError) {
            return {
                status: common_1.HttpStatus.BAD_GATEWAY,
                body: this.body(common_1.HttpStatus.BAD_GATEWAY, requestId, 'CHANNEL_ERROR', exception.message),
            };
        }
        if (exception instanceof channel_errors_1.LockedError) {
            return {
                status: 423,
                body: this.body(423, requestId, 'LOCKED', exception.message),
            };
        }
        if (exception instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            return this.mapPrisma(exception, requestId);
        }
        const err = exception;
        return {
            status: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
            body: this.body(common_1.HttpStatus.INTERNAL_SERVER_ERROR, requestId, 'INTERNAL', err?.message ?? 'Internal server error'),
        };
    }
    mapPrisma(err, requestId) {
        switch (err.code) {
            case 'P2025':
                return {
                    status: common_1.HttpStatus.NOT_FOUND,
                    body: this.body(common_1.HttpStatus.NOT_FOUND, requestId, 'NOT_FOUND', 'Resource not found'),
                };
            case 'P2002':
                return {
                    status: common_1.HttpStatus.CONFLICT,
                    body: this.body(common_1.HttpStatus.CONFLICT, requestId, 'CONFLICT', 'Unique constraint violated'),
                };
            case 'P2003':
                return {
                    status: common_1.HttpStatus.BAD_REQUEST,
                    body: this.body(common_1.HttpStatus.BAD_REQUEST, requestId, 'FK_VIOLATION', 'Foreign key constraint failed'),
                };
            default:
                return {
                    status: common_1.HttpStatus.BAD_REQUEST,
                    body: this.body(common_1.HttpStatus.BAD_REQUEST, requestId, `PRISMA_${err.code}`, err.message),
                };
        }
    }
    body(status, requestId, errorCode, message, detail) {
        return {
            code: status,
            message,
            data: null,
            requestId,
            errorCode,
            ...(detail === undefined ? {} : { detail }),
        };
    }
    codeFromStatus(status) {
        if (status >= 500)
            return 'INTERNAL';
        if (status === 401)
            return 'UNAUTHORIZED';
        if (status === 403)
            return 'FORBIDDEN';
        if (status === 404)
            return 'NOT_FOUND';
        if (status === 409)
            return 'CONFLICT';
        if (status === 422)
            return 'UNPROCESSABLE';
        if (status === 429)
            return 'RATE_LIMITED';
        return 'BAD_REQUEST';
    }
};
exports.GlobalExceptionFilter = GlobalExceptionFilter;
exports.GlobalExceptionFilter = GlobalExceptionFilter = GlobalExceptionFilter_1 = __decorate([
    (0, common_1.Catch)(),
    __metadata("design:paramtypes", [core_1.HttpAdapterHost])
], GlobalExceptionFilter);
//# sourceMappingURL=global-exception.filter.js.map