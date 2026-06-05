import { DocumentService } from './document.service';
import { IngestDocumentBodyDto } from './dto/ingest-document.dto';
import { ImportUrlBodyDto, UploadDocumentMetaBodyDto } from './dto/import-url.dto';
import { ChannelType } from '@/shared/types';
export declare class DocumentsController {
    private readonly documents;
    constructor(documents: DocumentService);
    list(channel: ChannelType, externalId: string): Promise<{
        status: string;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        botId: number;
        title: string;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        source: string | null;
        mimeType: string | null;
        rawText: string;
    }[]>;
    ingest(channel: ChannelType, externalId: string, body: IngestDocumentBodyDto): Promise<{
        status: string;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        botId: number;
        title: string;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        source: string | null;
        mimeType: string | null;
        rawText: string;
    }>;
    upload(channel: ChannelType, externalId: string, body: UploadDocumentMetaBodyDto, file: Express.Multer.File): Promise<{
        status: string;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        botId: number;
        title: string;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        source: string | null;
        mimeType: string | null;
        rawText: string;
    }>;
    importUrl(channel: ChannelType, externalId: string, body: ImportUrlBodyDto): Promise<{
        status: string;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        botId: number;
        title: string;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        source: string | null;
        mimeType: string | null;
        rawText: string;
    }>;
    remove(id: number): Promise<{
        ok: boolean;
    }>;
    reembed(id: number): Promise<{
        ok: boolean;
    }>;
}
