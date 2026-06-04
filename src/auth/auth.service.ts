import { Injectable } from '@nestjs/common';
import { BotStatus, ChannelType } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@/shared/prisma/prisma.service';

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
  ) {}

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

    return {
      accessToken: token,
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

    return {
      accessToken,
      access_token: accessToken,
      customer,
      bot,
      demo: true,
    };
  }
}
