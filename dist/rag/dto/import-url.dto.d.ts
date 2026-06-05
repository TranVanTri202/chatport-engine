export declare class ImportUrlDto {
    channel: string;
    externalId: string;
    url: string;
    title?: string;
}
export declare class UploadDocumentMetaDto {
    channel: string;
    externalId: string;
    title?: string;
}
declare const ImportUrlBodyDto_base: import("@nestjs/common").Type<Omit<ImportUrlDto, "channel" | "externalId">>;
export declare class ImportUrlBodyDto extends ImportUrlBodyDto_base {
}
declare const UploadDocumentMetaBodyDto_base: import("@nestjs/common").Type<Omit<UploadDocumentMetaDto, "channel" | "externalId">>;
export declare class UploadDocumentMetaBodyDto extends UploadDocumentMetaBodyDto_base {
}
export {};
