import { Injectable } from '@nestjs/common';

/**
 * In-memory map: zalo uid → live zca-js API instance.
 * Adapter-private. KHÔNG export ra ngoài module.
 */
@Injectable()
export class ZaloInstanceRegistry {
  // Use `unknown` here; the concrete API type comes from zca-js and we want
  // adapter code (the only thing that imports zca-js) to cast it.
  private readonly map = new Map<string, unknown>();

  set(botExternalId: string, api: unknown): void {
    this.map.set(botExternalId, api);
  }

  get(botExternalId: string): unknown | undefined {
    return this.map.get(botExternalId);
  }

  has(botExternalId: string): boolean {
    return this.map.has(botExternalId);
  }

  delete(botExternalId: string): void {
    this.map.delete(botExternalId);
  }

  keys(): string[] {
    return Array.from(this.map.keys());
  }
}
