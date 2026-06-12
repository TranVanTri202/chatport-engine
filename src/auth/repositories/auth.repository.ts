import { Injectable } from '@nestjs/common';
import { Customer, RefreshToken, Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/prisma/prisma.service';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── Customer ──────────────────────────────────────────────────────

  upsertCustomer(email: string, data: {
    name: string;
    picture?: string;
    firebaseUid?: string;
  }): Promise<Customer> {
    return this.prisma.customer.upsert({
      where: { email },
      update: {
        name: data.name,
        picture: data.picture,
        firebaseUid: data.firebaseUid,
      },
      create: {
        email,
        name: data.name,
        picture: data.picture,
        firebaseUid: data.firebaseUid,
      },
    });
  }

  // ── RefreshToken ──────────────────────────────────────────────────

  createRefreshToken(data: Prisma.RefreshTokenUncheckedCreateInput): Promise<RefreshToken> {
    return this.prisma.refreshToken.create({ data });
  }

  findRefreshToken(token: string) {
    return this.prisma.refreshToken.findUnique({
      where: { token },
      include: { customer: true },
    });
  }

  deleteRefreshToken(id: number): Promise<RefreshToken> {
    return this.prisma.refreshToken.delete({ where: { id } });
  }

  deleteRefreshTokensByToken(token: string): Promise<{ count: number }> {
    return this.prisma.refreshToken.deleteMany({ where: { token } });
  }
}
