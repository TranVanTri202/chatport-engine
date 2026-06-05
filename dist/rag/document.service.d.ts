import { Queue } from 'bullmq';
import { Document } from '@prisma/client';
import { ChannelType } from '@/shared/types';
import { BotService } from '@/bot/bot.service';
import { IngestDocumentDto } from './dto/ingest-document.dto';
import { DocumentLoaderService } from './loaders/document-loader.service';
import { DocumentRepository } from './repositories/document.repository';
export interface EmbedDocumentJob {
    documentId: number;
}
export declare class DocumentService {
    private readonly repo;
    private readonly loader;
    private readonly bots;
    private readonly queue;
    constructor(repo: DocumentRepository, loader: DocumentLoaderService, bots: BotService, queue: Queue<EmbedDocumentJob>);
    list(channel: ChannelType, externalId: string): Promise<Document[]>;
    ingest(dto: IngestDocumentDto): Promise<Document>;
    ingestFromFile(input: {
        channel: ChannelType;
        externalId: string;
        overrideTitle?: string;
        file: {
            originalname: string;
            mimetype: string;
            buffer: Buffer;
        };
    }): Promise<Document>;
    ingestFromUrl(input: {
        channel: ChannelType;
        externalId: string;
        url: string;
        overrideTitle?: string;
    }): Promise<Document>;
    delete(id: number): Promise<void>;
    reembed(id: number): Promise<void>;
    private create;
    private enqueue;
}
