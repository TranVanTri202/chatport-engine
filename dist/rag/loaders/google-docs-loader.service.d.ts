import { LoadedDocument } from './file-loader.service';
export declare class GoogleDocsLoaderService {
    private readonly logger;
    isGoogleUrl(url: string): boolean;
    load(url: string): Promise<LoadedDocument & {
        source: string;
    }>;
    private parse;
    private buildExportUrl;
    private titleFromParsed;
    private checkAccess;
    private extractTitle;
    private fetchText;
}
