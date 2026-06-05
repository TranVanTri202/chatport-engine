import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfig } from '@/shared/config/app.config';
import { PrismaService } from '@/shared/prisma/prisma.service';

export interface JwtPayload {
  sub: number; // userId / customerId
  customerId: number;
  email?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: AppConfig,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.jwtSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: payload.customerId },
    });
    if (!customer) {
      throw new UnauthorizedException('Customer account not found');
    }
    return payload;
  }
}
