/**
 * Keys stored in the request-scoped CLS store. Always use these constants —
 * a stray string typo would silently read `undefined`.
 */
export const CTX = {
  /** Resolved by JwtAuthGuard from the validated JWT payload. */
  CustomerId: 'customerId' as const,
  /** Same value the LoggingInterceptor stashes onto `req.id`. */
  RequestId: 'requestId' as const,
};

export interface AppClsStore {
  [CTX.CustomerId]?: number;
  [CTX.RequestId]?: string;
}
