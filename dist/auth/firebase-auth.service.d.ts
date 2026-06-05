import { AppConfig } from '@/shared/config/app.config';
import { SocialProvider, SocialUserProfile } from './auth.service';
export declare class FirebaseAuthService {
    private readonly config;
    private readonly app;
    constructor(config: AppConfig);
    private initializeApp;
    verifyIdToken(idToken: string, provider: SocialProvider): Promise<SocialUserProfile>;
}
