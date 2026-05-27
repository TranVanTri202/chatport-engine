import { Global, Module } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { randomUUID } from 'node:crypto';
import { CTX } from './request-context';

/**
 * Per-request store. Populated automatically for every HTTP request by the
 * middleware below; queried via `ClsService.get(CTX.X)` anywhere downstream.
 *
 *  - requestId: reused from X-Request-Id header or generated. Shared with
 *    LoggingInterceptor + GlobalExceptionFilter (both also read `req.id`).
 *  - customerId: filled in by `JwtAuthGuard` after the token is validated
 *    (see `auth/jwt-auth.guard.ts`). Read from any service via @CurrentCustomer.
 */
@Global()
@Module({
  imports: [
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        generateId: true,
        idGenerator: (req: { headers: Record<string, string | string[] | undefined> }) => {
          const h = req.headers['x-request-id'];
          return (Array.isArray(h) ? h[0] : h) ?? randomUUID();
        },
        setup: (cls, req: { id?: string }) => {
          cls.set(CTX.RequestId, req.id ?? cls.getId());
        },
      },
    }),
  ],
  exports: [ClsModule],
})
export class AppClsModule {}
