import { Injectable } from '@nestjs/common';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

@Injectable()
export class ZaloQrStorageService {
  private readonly qrPath = resolve(process.env.ZALO_QR_PATH ?? './qr.png');
  private readonly qrDir = dirname(this.qrPath);

  ensureExists(): void {
    mkdirSync(this.qrDir, { recursive: true });
  }

  getQrPath(): string {
    return this.qrPath;
  }

  getQrDir(): string {
    return this.qrDir;
  }

  getRootDir(): string {
    return this.qrDir;
  }
}
