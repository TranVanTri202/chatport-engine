"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuotaExceededError = void 0;
class QuotaExceededError extends Error {
    kind;
    botId;
    used;
    limit;
    constructor(kind, botId, used, limit) {
        super(`Quota exceeded for bot ${botId}: ${kind} ${used}/${limit}. Upgrade or reset.`);
        this.kind = kind;
        this.botId = botId;
        this.used = used;
        this.limit = limit;
        this.name = 'QuotaExceededError';
    }
}
exports.QuotaExceededError = QuotaExceededError;
//# sourceMappingURL=quota.errors.js.map