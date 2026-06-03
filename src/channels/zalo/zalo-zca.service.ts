import { Injectable } from '@nestjs/common';
import { ZaloInstanceRegistry } from './zalo-instance.registry';

export type ZaloUserProfile = {
  displayName: string | null;
  avatar: string | null;
};

/**
 * Thin wrapper around zca-js calls used by the Zalo channel.
 * Keep all SDK-facing helpers here so the rest of the app does not depend
 * directly on zca-js quirks or call signatures.
 */
@Injectable()
export class ZaloZcaService {
  constructor(private readonly instances: ZaloInstanceRegistry) {}

  async getUserProfile(
    botExternalId: string,
    userId: string,
  ): Promise<ZaloUserProfile | null> {
    const api = this.instances.get(botExternalId) as {
      getUserInfo?: (instance: unknown, userId: string) => Promise<unknown>;
    } | undefined;

    if (!api?.getUserInfo) return null;

    try {
      const result = (await api.getUserInfo(api, userId)) as {
        changed_profiles?: Record<string, {
          displayName?: string;
          zaloName?: string;
          username?: string;
          avatar?: string;
        }>;
        unchanged_profiles?: Record<string, {
          displayName?: string;
          zaloName?: string;
          username?: string;
          avatar?: string;
        }>;
      };

      const profile = result.changed_profiles?.[userId] ?? result.unchanged_profiles?.[userId];
      if (!profile) return null;

      return {
        displayName: profile.displayName || profile.zaloName || profile.username || null,
        avatar: profile.avatar || null,
      };
    } catch {
      return null;
    }
  }
}
