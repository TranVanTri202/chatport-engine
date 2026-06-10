import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { FileLoaderService, LoadedDocument } from './file-loader.service';
import { GoogleDocsLoaderService } from './google-docs-loader.service';

const URL_FETCH_TIMEOUT_MS = 30_000;
const URL_MAX_BYTES = 20 * 1024 * 1024;

/**
 * Single entry point for "give me text from X".
 *
 * Supports:
 *  - uploaded file   (Buffer + filename + mime)   → FileLoaderService
 *  - Google Docs/Sheets URL                        → GoogleDocsLoaderService
 *  - generic file URL (PDF, XLSX, DOCX, CSV, TXT)  → fetch + FileLoaderService
 *  - raw text JSON body                            → passthrough
 *
 * To add a new source (Notion, S3, …) drop in a sibling loader and add a
 * branch in loadUrl() — no other layer needs to know.
 */
@Injectable()
export class DocumentLoaderService {
  private readonly logger = new Logger(DocumentLoaderService.name);

  constructor(
    private readonly file: FileLoaderService,
    private readonly google: GoogleDocsLoaderService,
  ) {}

  async loadFile(input: {
    filename: string;
    mimeType?: string;
    buffer: Buffer;
  }): Promise<LoadedDocument & { source: string }> {
    const loaded = await this.file.load(input);
    return { ...loaded, source: input.filename };
  }

  async loadUrl(url: string): Promise<LoadedDocument & { source: string }> {
    // Google Docs/Sheets — delegate to specialised loader
    if (this.google.isGoogleUrl(url)) {
      return this.google.load(url);
    }

    // Generic file URL — download and extract text
    return this.loadGenericUrl(url);
  }

  /**
   * Download a file from any public URL and extract text using the same
   * FileLoaderService that handles uploads. Supports PDF, XLSX, DOCX,
   * CSV, TXT, and HTML.
   */
  private async loadGenericUrl(
    url: string,
  ): Promise<LoadedDocument & { source: string }> {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), URL_FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        redirect: 'follow',
      });

      if (!res.ok) {
        throw new BadRequestException(
          `Failed to fetch URL (${res.status}): ${res.statusText}`,
        );
      }

      const contentType = res.headers.get('content-type') ?? undefined;
      const buf = Buffer.from(await res.arrayBuffer());

      if (buf.byteLength === 0) {
        throw new BadRequestException('Downloaded file is empty');
      }
      if (buf.byteLength > URL_MAX_BYTES) {
        throw new BadRequestException(
          `File too large (${buf.byteLength} > ${URL_MAX_BYTES} bytes)`,
        );
      }

      // Derive a filename from the URL path or Content-Disposition header
      const disposition = res.headers.get('content-disposition') ?? '';
      const filenameMatch = disposition.match(/filename\*?=(?:UTF-8'')?([^;\n]+)/i);
      const filename =
        filenameMatch?.[1]?.replace(/["']/g, '') ??
        url.split('/').pop()?.split('?')[0] ??
        'downloaded-file';

      const loaded = await this.file.load({
        filename,
        mimeType: contentType,
        buffer: buf,
      });

      this.logger.log(
        `Downloaded & extracted: ${filename} (${buf.byteLength} bytes)`,
      );
      return { ...loaded, source: url };
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        throw new BadRequestException(
          `URL fetch timed out after ${URL_FETCH_TIMEOUT_MS / 1000}s`,
        );
      }
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(
        `Failed to load URL: ${(err as Error).message}`,
      );
    } finally {
      clearTimeout(t);
    }
  }
}
