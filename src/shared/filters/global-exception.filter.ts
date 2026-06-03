import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import {
  ChannelError,
  ChannelExpiredError,
  ChannelOfflineError,
  ChannelRateLimitedError,
  LockedError,
} from '@/shared/errors/channel.errors';
import { QuotaExceededError } from '@/shared/errors/quota.errors';

interface ErrorBody {
  code: number;
  message: string;
  data: null;
  requestId: string;
  errorCode: string;
  /** Only set in non-prod. */
  detail?: unknown;
}

/**
 * Single funnel for ALL exceptions. Maps to a stable response envelope so the
 * FE can rely on `body.error.code` instead of parsing message strings.
 *
 *  - HttpException     → its own status + message
 *  - ChannelError      → 503 family (offline/expired/rate-limited/send)
 *  - LockedError       → 423 (queued retry should handle, but if leaks out)
 *  - Prisma known err  → 404 / 409 / 400 (P2025 / P2002 / fallback)
 *  - Anything else     → 500 + log full stack
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly adapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<{ id?: string; url?: string; method?: string }>();
    const res = ctx.getResponse();
    const requestId = req?.id ?? randomUUID();

    const { status, body } = this.map(exception, requestId);

    if (status >= 500) {
      this.logger.error(
        `${req?.method} ${req?.url} → ${status} (${body.errorCode}) ${body.message}`,
        (exception as Error)?.stack,
      );
    } else {
      this.logger.warn(
        `${req?.method} ${req?.url} → ${status} (${body.errorCode}) ${body.message}`,
      );
    }

    this.adapterHost.httpAdapter.reply(res, body, status);
  }

  private map(
    exception: unknown,
    requestId: string,
  ): { status: number; body: ErrorBody } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const message =
        typeof response === 'string'
          ? response
          : ((response as { message?: string | string[] }).message ??
              exception.message);
      return {
        status,
        body: this.body(
          status,
          requestId,
          this.codeFromStatus(status),
          Array.isArray(message) ? message.join('; ') : message,
        ),
      };
    }

    if (exception instanceof QuotaExceededError) {
      return {
        status: HttpStatus.PAYMENT_REQUIRED,
        body: {
          code: HttpStatus.PAYMENT_REQUIRED,
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

    if (exception instanceof ChannelExpiredError) {
      return {
        status: HttpStatus.SERVICE_UNAVAILABLE,
        body: this.body(
          HttpStatus.SERVICE_UNAVAILABLE,
          requestId,
          'CHANNEL_EXPIRED',
          exception.message,
        ),
      };
    }
    if (exception instanceof ChannelOfflineError) {
      return {
        status: HttpStatus.SERVICE_UNAVAILABLE,
        body: this.body(
          HttpStatus.SERVICE_UNAVAILABLE,
          requestId,
          'CHANNEL_OFFLINE',
          exception.message,
        ),
      };
    }
    if (exception instanceof ChannelRateLimitedError) {
      return {
        status: HttpStatus.TOO_MANY_REQUESTS,
        body: this.body(
          HttpStatus.TOO_MANY_REQUESTS,
          requestId,
          'CHANNEL_RATE_LIMITED',
          exception.message,
        ),
      };
    }
    if (exception instanceof ChannelError) {
      return {
        status: HttpStatus.BAD_GATEWAY,
        body: this.body(
          HttpStatus.BAD_GATEWAY,
          requestId,
          'CHANNEL_ERROR',
          exception.message,
        ),
      };
    }
    if (exception instanceof LockedError) {
      return {
        status: 423,
        body: this.body(423, requestId, 'LOCKED', exception.message),
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.mapPrisma(exception, requestId);
    }

    const err = exception as Error;
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: this.body(
        HttpStatus.INTERNAL_SERVER_ERROR,
        requestId,
        'INTERNAL',
        err?.message ?? 'Internal server error',
      ),
    };
  }

  private mapPrisma(
    err: Prisma.PrismaClientKnownRequestError,
    requestId: string,
  ): { status: number; body: ErrorBody } {
    switch (err.code) {
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          body: this.body(
            HttpStatus.NOT_FOUND,
            requestId,
            'NOT_FOUND',
            'Resource not found',
          ),
        };
      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          body: this.body(
            HttpStatus.CONFLICT,
            requestId,
            'CONFLICT',
            'Unique constraint violated',
          ),
        };
      case 'P2003':
        return {
          status: HttpStatus.BAD_REQUEST,
          body: this.body(
            HttpStatus.BAD_REQUEST,
            requestId,
            'FK_VIOLATION',
            'Foreign key constraint failed',
          ),
        };
      default:
        return {
          status: HttpStatus.BAD_REQUEST,
          body: this.body(
            HttpStatus.BAD_REQUEST,
            requestId,
            `PRISMA_${err.code}`,
            err.message,
          ),
        };
    }
  }

  private body(
    status: number,
    requestId: string,
    errorCode: string,
    message: string,
    detail?: unknown,
  ): ErrorBody {
    return {
      code: status,
      message,
      data: null,
      requestId,
      errorCode,
      ...(detail === undefined ? {} : { detail }),
    };
  }

  private codeFromStatus(status: number): string {
    if (status >= 500) return 'INTERNAL';
    if (status === 401) return 'UNAUTHORIZED';
    if (status === 403) return 'FORBIDDEN';
    if (status === 404) return 'NOT_FOUND';
    if (status === 409) return 'CONFLICT';
    if (status === 422) return 'UNPROCESSABLE';
    if (status === 429) return 'RATE_LIMITED';
    return 'BAD_REQUEST';
  }
}
