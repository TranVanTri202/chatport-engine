export declare class IngestDocumentDto {
    channel: string;
    externalId: string;
    title: string;
    rawText: string;
    source?: string;
    mimeType?: string;
}
declare const IngestDocumentBodyDto_base: import("@nestjs/common").Type<Omit<IngestDocumentDto, "channel" | "externalId">>;
export declare class IngestDocumentBodyDto extends IngestDocumentBodyDto_base {
}
export {};
