import { AuthService, SocialProvider } from './auth.service';
import { FirebaseAuthService } from './firebase-auth.service';
declare class FirebaseLoginDto {
    provider: SocialProvider;
    idToken: string;
}
declare class RefreshTokenDto {
    refreshToken: string;
}
declare class LocalLoginDto {
    email: string;
}
export declare class AuthController {
    private readonly firebaseAuth;
    private readonly authService;
    constructor(firebaseAuth: FirebaseAuthService, authService: AuthService);
    socialLogin(body: FirebaseLoginDto): Promise<{
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
    login(body: LocalLoginDto): Promise<{
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
    refresh(body: RefreshTokenDto): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(body: RefreshTokenDto): Promise<{
        ok: boolean;
    }>;
}
export {};
