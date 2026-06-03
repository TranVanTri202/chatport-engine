import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const DEFAULT_STORAGE_ROOT = process.env.STORAGE_ROOT ?? join(process.cwd(), 'storage');

export function getStorageDir(...segments: string[]): string {
  return join(DEFAULT_STORAGE_ROOT, ...segments);
}

export function ensureWritableStorageDir(...segments: string[]): string {
  const dir = getStorageDir(...segments);
  mkdirSync(dir, { recursive: true });
  return dir;
}
