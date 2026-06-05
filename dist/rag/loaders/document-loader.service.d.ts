import { FileLoaderService, LoadedDocument } from './file-loader.service';
import { GoogleDocsLoaderService } from './google-docs-loader.service';
export declare class DocumentLoaderService {
    private readonly file;
    private readonly google;
    private readonly logger;
    constructor(file: FileLoaderService, google: GoogleDocsLoaderService);
    loadFile(input: {
        filename: string;
        mimeType?: string;
        buffer: Buffer;
    }): Promise<LoadedDocument & {
        source: string;
    }>;
    loadUrl(url: string): Promise<LoadedDocument & {
        source: string;
    }>;
}
