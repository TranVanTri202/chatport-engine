import { Injectable, UnauthorizedException } from '@nestjs/common';
import { BotStatus, ChannelType } from '@prisma/client';
import { randomUUID, randomBytes } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import { AppConfig } from '@/shared/config/app.config';
import { AuthRepository } from './repositories/auth.repository';

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
    private readonly repo: AuthRepository,
    private readonly jwt: JwtService,
    private readonly config: AppConfig,
  ) {}

  private async generateRefreshToken(customerId: number): Promise<string> {
    const token = randomBytes(64).toString('hex');
    const expiresAt = new Date(
      Date.now() + this.config.jwtRefreshExpiresInDays * 24 * 60 * 60 * 1000,
    );
    await this.repo.createRefreshToken({
      token,
      customerId,
      expiresAt,
    });
    return token;
  }

  async loginWithFirebase(profile: SocialUserProfile): Promise<{
    accessToken: string;
    refreshToken: string;
    customer: { id: number; name: string; email: string; picture: string | null; firebaseUid: string | null; provider: string };
  }> {
    const customer = await this.repo.upsertCustomer(profile.email, {
      name: profile.name,
      picture: profile.picture,
      firebaseUid: profile.firebaseUid,
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

  async login(email: string): Promise<{
    accessToken: string;
    access_token: string;
    refreshToken: string;
    customer: { id: number; name: string; email: string };
  }> {
    const defaultName = email.split('@')[0] || 'User';
    const customer = await this.repo.upsertCustomer(email, {
      name: defaultName,
    });

    const accessToken = await this.jwt.signAsync({
      sub: customer.id,
      customerId: customer.id,
      email: customer.email,
    });

    const refreshToken = await this.generateRefreshToken(customer.id);

    return {
      accessToken,
      access_token: accessToken,
      refreshToken,
      customer,
    };
  }

  async refresh(token: string): Promise<{ accessToken: string; refreshToken: string }> {
    const record = await this.repo.findRefreshToken(token);

    if (!record || record.expiresAt < new Date()) {
      if (record) {
        await this.repo.deleteRefreshToken(record.id).catch(() => undefined);
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const accessToken = await this.jwt.signAsync({
      sub: record.customerId,
      customerId: record.customerId,
      email: record.customer.email,
    });

    const newRefreshToken = await this.generateRefreshToken(record.customerId);
    await this.repo.deleteRefreshToken(record.id).catch(() => undefined);

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(token: string): Promise<void> {
    await this.repo.deleteRefreshTokensByToken(token);
  }
}
