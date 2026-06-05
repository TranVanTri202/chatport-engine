"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggingInterceptor = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const node_perf_hooks_1 = require("node:perf_hooks");
const rxjs_1 = require("rxjs");
let LoggingInterceptor = class LoggingInterceptor {
    logger = new common_1.Logger('HTTP');
    intercept(context, next) {
        if (context.getType() !== 'http')
            return next.handle();
        const startedAt = node_perf_hooks_1.performance.now();
        const http = context.switchToHttp();
        const req = http.getRequest();
        const res = http.getResponse();
        const headerId = req.headers['x-request-id'];
        const requestId = (Array.isArray(headerId) ? headerId[0] : headerId) ?? (0, node_crypto_1.randomUUID)();
        req.id = requestId;
        res.setHeader('X-Request-Id', requestId);
        const route = `${req.method} ${req.originalUrl ?? req.url}`;
        const ip = req.ip ?? '-';
        return next.handle().pipe((0, rxjs_1.tap)({
            next: () => {
                const duration = Math.round(node_perf_hooks_1.performance.now() - startedAt);
                this.logger.log(`${route} - ${res.statusCode} - ${duration}ms`);
            },
            error: () => {
                const duration = Math.round(node_perf_hooks_1.performance.now() - startedAt);
                this.logger.warn(`${ip} - ${route} - ERR - ${duration}ms`);
            },
        }));
    }
};
exports.LoggingInterceptor = LoggingInterceptor;
exports.LoggingInterceptor = LoggingInterceptor = __decorate([
    (0, common_1.Injectable)()
], LoggingInterceptor);
//# sourceMappingURL=logging.interceptor.js.map