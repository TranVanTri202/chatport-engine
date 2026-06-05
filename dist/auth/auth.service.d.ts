import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { AppConfig } from '@/shared/config/app.config';
export type SocialProvider = 'google' | 'facebook';
export interface SocialUserProfile {
    email: string;
    name: string;
    picture?: string;
    firebaseUid: string;
    provider: SocialProvider;
}
export declare class AuthService {
    private readonly prisma;
    private readonly jwt;
    private readonly config;
    constructor(prisma: PrismaService, jwt: JwtService, config: AppConfig);
    private generateRefreshToken;
    loginWithFirebase(profile: SocialUserProfile): Promise<{
        accessToken: string;
        refreshToken: string;
        customer: {
            id: number;
            name: string;
            email: string;
            picture: string | null;
            firebaseUid: string | null;
            provider: SocialProvider;
        };
    }>;
    login(email: string): Promise<{
        accessToken: string;
        access_token: string;
        refreshToken: string;
        customer: {
            id: number;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            email: string;
            firebaseUid: string | null;
            picture: string | null;
            preferences: import("@prisma/client/runtime/library").JsonValue;
        };
    }>;
    refresh(token: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(token: string): Promise<void>;
}
