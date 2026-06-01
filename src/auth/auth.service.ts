import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@/shared/prisma/prisma.service';

export type SocialProvider = 'google' | 'facebook';

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
}
