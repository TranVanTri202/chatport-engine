import { Injectable, UnauthorizedException } from '@nestjs/common';
import { BotStatus, ChannelType } from '@prisma/client';
import { randomUUID, randomBytes } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { AppConfig } from '@/shared/config/app.config';

export type SocialProvider = 'google' | 'facebook';
const DEMO_CUSTOMER_EMAIL = 'demo@askbase.local';
const DEMO_CUSTOMER_NAME = 'Demo Customer';

export interface SocialUserProfile {
  email: string;
  name: string;
  picture?: string;
  firebaseUid: string;
  provider: SocialProvider;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: AppConfig,
  ) {}

  private async generateRefreshToken(customerId: number): Promise<string> {
    const token = randomBytes(64).toString('hex');
    const expiresAt = new Date(
      Date.now() + this.config.jwtRefreshExpiresInDays * 24 * 60 * 60 * 1000,
    );
    await this.prisma.refreshToken.create({
      data: {
        token,
        customerId,
        expiresAt,
      },
    });
    return token;
  }

  async loginWithFirebase(profile: SocialUserProfile) {
    const customer = await this.prisma.customer.upsert({
      where: { email: profile.email },
      update: {
        name: profile.name,
        picture: profile.picture,
        firebaseUid: profile.firebaseUid,
      },
      create: {
        email: profile.email,
        name: profile.name,
        picture: profile.picture,
        firebaseUid: profile.firebaseUid,
      },
    });

    const token = await this.jwt.signAsync({
      sub: customer.id,
      customerId: customer.id,
      email: profile.email,
      provider: profile.provider,
      firebaseUid: profile.firebaseUid,
    });

    const refreshToken = await this.generateRefreshToken(customer.id);

    return {
      accessToken: token,
      refreshToken,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        picture: customer.picture,
        firebaseUid: customer.firebaseUid,
        provider: profile.provider,
      },
    };
  }

  async loginDemo() {
    // Demo login is intentionally idempotent: reuse the same demo customer/bot if they already exist.
    const customer = await this.prisma.customer.upsert({
      where: { email: DEMO_CUSTOMER_EMAIL },
      update: {
        name: DEMO_CUSTOMER_NAME,
      },
      create: {
        email: DEMO_CUSTOMER_EMAIL,
        name: DEMO_CUSTOMER_NAME,
      },
    });

    const bot =
      (await this.prisma.bot.findFirst({
        where: {
          customerId: customer.id,
          channel: ChannelType.zalo,
        },
      })) ??
      (await this.prisma.bot.create({
        data: {
          customerId: customer.id,
          channel: ChannelType.zalo,
          externalId: randomUUID(),
          name: 'Demo Bot',
          status: BotStatus.active,
        },
      }));

    const accessToken = await this.jwt.signAsync({
      sub: customer.id,
      customerId: customer.id,
      email: customer.email,
      demo: true,
    });

    const refreshToken = await this.generateRefreshToken(customer.id);

    return {
      accessToken,
      access_token: accessToken,
      refreshToken,
      customer,
      bot,
      demo: true,
    };
  }

  async refresh(token: string) {
    const record = await this.prisma.refreshToken.findUnique({
      where: { token },
      include: { customer: true },
    });

    if (!record || record.expiresAt < new Date()) {
      if (record) {
        await this.prisma.refreshToken.delete({ where: { id: record.id } }).catch(() => undefined);
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const accessToken = await this.jwt.signAsync({
      sub: record.customerId,
      customerId: record.customerId,
      email: record.customer.email,
    });

    const newRefreshToken = await this.generateRefreshToken(record.customerId);
    await this.prisma.refreshToken.delete({
      where: { id: record.id },
    }).catch(() => undefined);

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(token: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { token },
    });
  }
}
