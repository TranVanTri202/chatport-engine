import { WorkerHost } from '@nestjs/bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Job } from 'bullmq';
import { ChunkerService } from './chunker.service';
import { EmbeddingService } from './embedding.service';
import { EmbedDocumentJob } from './document.service';
import { DocumentRepository } from './repositories/document.repository';
import { DocumentChunkRepository } from './repositories/document-chunk.repository';
export declare class EmbedProcessor extends WorkerHost {
    private readonly docRepo;
    private readonly chunkRepo;
    private readonly chunker;
    private readonly embeddings;
    private readonly events;
    private readonly logger;
    constructor(docRepo: DocumentRepository, chunkRepo: DocumentChunkRepository, chunker: ChunkerService, embeddings: EmbeddingService, events: EventEmitter2);
    process(job: Job<EmbedDocumentJob>): Promise<void>;
    onFailed(job: Job<EmbedDocumentJob>, err: Error): void;
}
