import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const startedAt = performance.now();
    const http = context.switchToHttp();
    const req = http.getRequest<{
      id?: string;
      method?: string;
      originalUrl?: string;
      url?: string;
      headers: Record<string, string | string[] | undefined>;
      ip?: string;
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

    const route = `${req.method} ${req.originalUrl ?? req.url}`;
    const ip = req.ip ?? '-';

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Math.round(performance.now() - startedAt);
          this.logger.log(`${route} - ${res.statusCode} - ${duration}ms`);
        },
        error: () => {
          const duration = Math.round(performance.now() - startedAt);
          this.logger.warn(`${ip} - ${route} - ERR - ${duration}ms`);
        },
      }),
    );
  }
}
