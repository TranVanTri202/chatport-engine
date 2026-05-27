export type QuotaKind = 'request' | 'document';

/**
 * Thrown when a bot would exceed its trial limits (request count or
 * attached-document count). Mapped to HTTP 402 by `GlobalExceptionFilter`.
 */
export class QuotaExceededError extends Error {
  constructor(
    public readonly kind: QuotaKind,
    public readonly botId: number,
    public readonly used: number,
    public readonly limit: number,
  ) {
    super(
      `Quota exceeded for bot ${botId}: ${kind} ${used}/${limit}. Upgrade or reset.`,
    );
    this.name = 'QuotaExceededError';
  }
}
