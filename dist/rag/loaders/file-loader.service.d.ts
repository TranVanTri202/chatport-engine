export interface LoadedDocument {
    rawText: string;
    mimeType: string;
    title: string;
}
export declare class FileLoaderService {
    private readonly logger;
    load(input: {
        filename: string;
        mimeType?: string;
        buffer: Buffer;
    }): Promise<LoadedDocument>;
    private resolveKind;
    private loadPdf;
    private loadDocx;
    private loadXlsx;
    private stripHtml;
}
