import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { FileLoaderService, LoadedDocument } from './file-loader.service';
import { GoogleDocsLoaderService } from './google-docs-loader.service';

/**
 * Single entry point for "give me text from X".
 * Today X is one of:
 *  - an uploaded file (Buffer + filename + mime)
 *  - a public Google Docs/Sheets URL
 *
 * To add a new source (Notion, generic web, S3, …) drop in a new sibling
 * loader and add a method here — no other layer needs to know.
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
    if (this.google.isGoogleUrl(url)) {
      return this.google.load(url);
    }
    // Future loaders (generic web, Notion, etc.) plug in here.
    throw new BadRequestException(
      'Only Google Docs/Sheets URLs are supported for now',
    );
  }
}
