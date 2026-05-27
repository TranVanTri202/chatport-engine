import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Observable, tap } from 'rxjs';

/**
 * Per-request access log with duration + requestId.
 *
 *  - Adds `X-Request-Id` to every response.
 *  - Reuses inbound `X-Request-Id` if the upstream LB / FE sent one.
 *  - Skips WebSocket / RPC contexts (those have their own lifecycle).
 *
 * Stack with the global `GlobalExceptionFilter` — the filter also reads
 * `req.id` to surface it in error bodies.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const http = context.switchToHttp();
    const req = http.getRequest<{
      id?: string;
      method?: string;
      originalUrl?: string;
      url?: string;
      headers: Record<string, string | string[] | undefined>;
    }>();
    const res = http.getResponse<{
      statusCode: number;
      setHeader: (k: string, v: string) => void;
    }>();

    const headerId = req.headers['x-request-id'];
    const requestId =
      (Array.isArray(headerId) ? headerId[0] : headerId) ?? randomUUID();
    req.id = requestId;
    res.setHeader('X-Request-Id', requestId);

    const start = Date.now();
    const route = `${req.method} ${req.originalUrl ?? req.url}`;

    return next.handle().pipe(
      tap({
        next: () => {
          const ms = Date.now() - start;
          this.logger.log(`${route} ${res.statusCode} ${ms}ms [${requestId}]`);
        },
        error: () => {
          const ms = Date.now() - start;
          this.logger.warn(`${route} ERR ${ms}ms [${requestId}]`);
        },
      }),
    );
  }
}
