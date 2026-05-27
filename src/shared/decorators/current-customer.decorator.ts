import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtPayload } from '@/auth/jwt.strategy';

/**
 * Extract the authenticated customer id straight off the JWT payload that
 * `JwtStrategy.validate` stashed onto `req.user`.
 *
 * Use this everywhere the controller previously read `customerId` from
 * `@Query`/`@Body` — those query-string variants stay for compatibility but
 * the JWT is the source of truth.
 */
export const CurrentCustomer = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): number => {
    const req = ctx.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const id = req.user?.customerId;
    if (!id) throw new UnauthorizedException('No customer context');
    return id;
  },
);
