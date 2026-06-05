export type QuotaKind = 'request' | 'document';
export declare class QuotaExceededError extends Error {
    readonly kind: QuotaKind;
    readonly botId: number;
    readonly used: number;
    readonly limit: number;
    constructor(kind: QuotaKind, botId: number, used: number, limit: number);
}
