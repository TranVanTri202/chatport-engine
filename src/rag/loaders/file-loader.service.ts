import {
  Injectable,
  Logger,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import * as path from 'node:path';

export interface LoadedDocument {
  /** Plain-text contents the chunker will work on. */
  rawText: string;
  /** Canonical MIME type for the source. */
  mimeType: string;
  /** Suggested title — usually the original filename without extension. */
  title: string;
}

const MAX_BUFFER_BYTES = 20 * 1024 * 1024;

/**
 * Extract plain text from an uploaded file buffer.
 *
 * Supports: PDF · DOCX · XLSX · CSV · TXT · MD · HTML.
 * Decides extractor by extension first, then falls back to MIME.
 *
 * The output `rawText` is what the existing RecursiveCharacterTextSplitter
 * already handles well — no per-mime chunker strategies (per design choice).
 */
@Injectable()
export class FileLoaderService {
  private readonly logger = new Logger(FileLoaderService.name);

  async load(input: {
    filename: string;
    mimeType?: string;
    buffer: Buffer;
  }): Promise<LoadedDocument> {
    if (input.buffer.byteLength === 0) {
      throw new UnsupportedMediaTypeException('Empty file');
    }
    if (input.buffer.byteLength > MAX_BUFFER_BYTES) {
      throw new UnsupportedMediaTypeException(
        `File exceeds ${MAX_BUFFER_BYTES} bytes`,
      );
    }

    const ext = path.extname(input.filename).toLowerCase().replace(/^\./, '');
    const kind = this.resolveKind(ext, input.mimeType);
    const title = path.basename(input.filename, path.extname(input.filename));

    switch (kind) {
      case 'pdf':
        return {
          rawText: await this.loadPdf(input.buffer),
          mimeType: 'application/pdf',
          title,
        };
      case 'docx':
        return {
          rawText: await this.loadDocx(input.buffer),
          mimeType:
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          title,
        };
      case 'xlsx':
        return {
          rawText: this.loadXlsx(input.buffer),
          mimeType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          title,
        };
      case 'csv':
        return {
          rawText: input.buffer.toString('utf8'),
          mimeType: 'text/csv',
          title,
        };
      case 'html':
        return {
          rawText: this.stripHtml(input.buffer.toString('utf8')),
          mimeType: 'text/html',
          title,
        };
      case 'text':
      default:
        return {
          rawText: input.buffer.toString('utf8'),
          mimeType: input.mimeType ?? 'text/plain',
          title,
        };
    }
  }

  private resolveKind(
    ext: string,
    mime?: string,
  ): 'pdf' | 'docx' | 'xlsx' | 'csv' | 'html' | 'text' {
    if (ext === 'pdf' || mime === 'application/pdf') return 'pdf';
    if (
      ext === 'docx' ||
      mime ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      return 'docx';
    }
    if (
      ext === 'xlsx' ||
      ext === 'xls' ||
      mime?.startsWith('application/vnd.ms-excel') ||
      mime ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) {
      return 'xlsx';
    }
    if (ext === 'csv' || mime === 'text/csv') return 'csv';
    if (ext === 'html' || ext === 'htm' || mime === 'text/html') return 'html';
    if (
      ext === 'txt' ||
      ext === 'md' ||
      ext === 'markdown' ||
      mime?.startsWith('text/')
    ) {
      return 'text';
    }
    throw new UnsupportedMediaTypeException(
      `Unsupported file type: ext=.${ext} mime=${mime ?? 'unknown'}`,
    );
  }

  private async loadPdf(buf: Buffer): Promise<string> {
    // Import from internal path to bypass pdf-parse's debug-mode check that
    // runs when the package's index.js is imported as the entry module.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse/lib/pdf-parse.js') as (
      data: Buffer,
    ) => Promise<{ text: string }>;
    const out = await pdfParse(buf);
    return out.text ?? '';
  }

  private async loadDocx(buf: Buffer): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mammoth = require('mammoth') as {
      extractRawText: (input: { buffer: Buffer }) => Promise<{ value: string }>;
    };
    const out = await mammoth.extractRawText({ buffer: buf });
    return out.value ?? '';
  }

  private loadXlsx(buf: Buffer): string {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const XLSX = require('xlsx') as typeof import('xlsx');
    const wb = XLSX.read(buf, { type: 'buffer' });
    // Each sheet becomes its own CSV block prefixed with a header line so
    // retrieval can tell tables apart later.
    return wb.SheetNames.map((name) => {
      const sheet = wb.Sheets[name];
      if (!sheet) return '';
      const csv = XLSX.utils.sheet_to_csv(sheet);
      return `# Sheet: ${name}\n${csv}`;
    })
      .filter(Boolean)
      .join('\n\n');
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
