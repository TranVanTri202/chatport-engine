import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { LoadedDocument } from './file-loader.service';

interface ParsedGoogleUrl {
  kind: 'docs' | 'sheets';
  id: string;
  gid?: string;
}

const FETCH_TIMEOUT_MS = 20_000;
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Fetch text from a publicly-shared Google Docs / Sheets URL.
 *
 *  - Docs:   https://docs.google.com/document/d/{ID}/edit
 *            → export `format=txt`
 *  - Sheets: https://docs.google.com/spreadsheets/d/{ID}/edit#gid={GID}
 *            → export `format=csv&gid={GID}` (single tab; gid=0 if omitted)
 *
 * Requires "anyone with the link can view" sharing on the document. Private
 * docs need the Google Drive OAuth loader (not implemented in this scaffold).
 */
@Injectable()
export class GoogleDocsLoaderService {
  private readonly logger = new Logger(GoogleDocsLoaderService.name);

  isGoogleUrl(url: string): boolean {
    try {
      return new URL(url).hostname.endsWith('docs.google.com');
    } catch {
      return false;
    }
  }

  async load(url: string): Promise<LoadedDocument & { source: string }> {
    const parsed = this.parse(url);
    const exportUrl = this.buildExportUrl(parsed);
    const text = await this.fetchText(exportUrl);

    return {
      rawText: text,
      mimeType:
        parsed.kind === 'docs'
          ? 'application/vnd.google-apps.document'
          : 'application/vnd.google-apps.spreadsheet',
      title: this.titleFromParsed(parsed),
      source: url,
    };
  }

  private parse(rawUrl: string): ParsedGoogleUrl {
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      throw new BadRequestException('Invalid URL');
    }
    if (!url.hostname.endsWith('docs.google.com')) {
      throw new BadRequestException(
        'Not a Google Docs/Sheets URL (host must be docs.google.com)',
      );
    }

    const docsMatch = url.pathname.match(/^\/document\/d\/([^/]+)/);
    if (docsMatch?.[1]) {
      return { kind: 'docs', id: docsMatch[1] };
    }

    const sheetsMatch = url.pathname.match(/^\/spreadsheets\/d\/([^/]+)/);
    if (sheetsMatch?.[1]) {
      const gidFromHash = url.hash.match(/gid=(\d+)/)?.[1];
      const gidFromQuery = url.searchParams.get('gid') ?? undefined;
      return {
        kind: 'sheets',
        id: sheetsMatch[1],
        gid: gidFromQuery ?? gidFromHash ?? '0',
      };
    }

    throw new BadRequestException(
      'URL must be /document/d/{ID}/... or /spreadsheets/d/{ID}/...',
    );
  }

  private buildExportUrl(p: ParsedGoogleUrl): string {
    if (p.kind === 'docs') {
      return `https://docs.google.com/document/d/${p.id}/export?format=txt`;
    }
    return `https://docs.google.com/spreadsheets/d/${p.id}/export?format=csv&gid=${p.gid ?? '0'}`;
  }

  private titleFromParsed(p: ParsedGoogleUrl): string {
    return p.kind === 'docs' ? `GDoc ${p.id}` : `GSheet ${p.id}/${p.gid ?? '0'}`;
  }

  private async fetchText(url: string): Promise<string> {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        redirect: 'follow',
      });
      if (!res.ok) {
        throw new BadRequestException(
          `Google export failed (${res.status}). Check that the document is shared "anyone with the link".`,
        );
      }
      const ct = res.headers.get('content-type') ?? '';
      if (ct.startsWith('text/html')) {
        // Google redirects unshared docs to a login HTML page rather than 4xx.
        throw new BadRequestException(
          'Got an HTML login page — document is likely not public.',
        );
      }
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.byteLength > MAX_BYTES) {
        throw new BadRequestException(
          `Document too large (>${MAX_BYTES} bytes)`,
        );
      }
      return buf.toString('utf8');
    } finally {
      clearTimeout(t);
    }
  }
}
