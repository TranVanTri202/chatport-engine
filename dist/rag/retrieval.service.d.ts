import { EmbeddingService } from './embedding.service';
import { DocumentChunkRepository } from './repositories/document-chunk.repository';
export interface RetrievedChunk {
    id: string;
    content: string;
    score: number;
}
export declare class RetrievalService {
    private readonly embeddings;
    private readonly chunkRepo;
    constructor(embeddings: EmbeddingService, chunkRepo: DocumentChunkRepository);
    search(botId: number, query: string, k?: number): Promise<RetrievedChunk[]>;
}
