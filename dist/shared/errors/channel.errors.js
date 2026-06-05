"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LockedError = exports.ChannelSendError = exports.ChannelRateLimitedError = exports.ChannelExpiredError = exports.ChannelOfflineError = exports.ChannelError = void 0;
class ChannelError extends Error {
    cause;
    constructor(message, cause) {
        super(message);
        this.cause = cause;
        this.name = new.target.name;
    }
}
exports.ChannelError = ChannelError;
class ChannelOfflineError extends ChannelError {
    botExternalId;
    constructor(botExternalId) {
        super(`Channel offline for bot ${botExternalId}`);
        this.botExternalId = botExternalId;
    }
}
exports.ChannelOfflineError = ChannelOfflineError;
class ChannelExpiredError extends ChannelError {
    botExternalId;
    constructor(botExternalId) {
        super(`Channel expired for bot ${botExternalId}`);
        this.botExternalId = botExternalId;
    }
}
exports.ChannelExpiredError = ChannelExpiredError;
class ChannelRateLimitedError extends ChannelError {
    retryAfterMs;
    constructor(retryAfterMs) {
        super('Channel rate limited');
        this.retryAfterMs = retryAfterMs;
    }
}
exports.ChannelRateLimitedError = ChannelRateLimitedError;
class ChannelSendError extends ChannelError {
}
exports.ChannelSendError = ChannelSendError;
class LockedError extends Error {
    lockKey;
    constructor(lockKey) {
        super(`Resource locked: ${lockKey}`);
        this.lockKey = lockKey;
        this.name = 'LockedError';
    }
}
exports.LockedError = LockedError;
//# sourceMappingURL=channel.errors.js.map