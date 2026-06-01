import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { AppConfig } from '@/shared/config/app.config';
import { SocialProvider, SocialUserProfile } from './auth.service';

@Injectable()
export class FirebaseAuthService {
  private readonly app: admin.app.App;

  constructor(private readonly config: AppConfig) {
    this.app = admin.apps.length ? admin.app() : this.initializeApp();
  }

  private initializeApp(): admin.app.App {
    const serviceAccountJson = this.config.firebaseServiceAccountJson;

    if (serviceAccountJson) {
      try {
        const serviceAccount = JSON.parse(serviceAccountJson) as admin.ServiceAccount;
        return admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
      } catch {
        throw new InternalServerErrorException('Invalid FIREBASE_SERVICE_ACCOUNT_JSON');
      }
    }

    const clientEmail = this.config.firebaseClientEmail;
    const privateKey = this.config.firebasePrivateKey?.replace(/\\n/g, '\n');

    if (clientEmail && privateKey) {
      return admin.initializeApp({
        credential: admin.credential.cert({
          projectId: this.config.firebaseProjectId,
          clientEmail,
          privateKey,
        }),
      });
    }

    return admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: this.config.firebaseProjectId,
    });
  }

  async verifyIdToken(idToken: string, provider: SocialProvider): Promise<SocialUserProfile> {
    try {
      const decoded = await this.app.auth().verifyIdToken(idToken);
      const metadata = await this.app.auth().getUser(decoded.uid);

      return {
        email: decoded.email ?? metadata.email ?? '',
        name: decoded.name ?? metadata.displayName ?? 'User',
        picture: decoded.picture ?? metadata.photoURL ?? undefined,
        firebaseUid: decoded.uid,
        provider,
      };
    } catch {
      throw new UnauthorizedException('Invalid Firebase idToken');
    }
  }
}
