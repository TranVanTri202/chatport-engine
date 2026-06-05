export declare class ChannelError extends Error {
    readonly cause?: unknown | undefined;
    constructor(message: string, cause?: unknown | undefined);
}
export declare class ChannelOfflineError extends ChannelError {
    readonly botExternalId: string;
    constructor(botExternalId: string);
}
export declare class ChannelExpiredError extends ChannelError {
    readonly botExternalId: string;
    constructor(botExternalId: string);
}
export declare class ChannelRateLimitedError extends ChannelError {
    readonly retryAfterMs?: number | undefined;
    constructor(retryAfterMs?: number | undefined);
}
export declare class ChannelSendError extends ChannelError {
}
export declare class LockedError extends Error {
    readonly lockKey: string;
    constructor(lockKey: string);
}
