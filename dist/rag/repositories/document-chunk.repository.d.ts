import { PrismaService } from '@/shared/prisma/prisma.service';
export interface RetrievedChunkRow {
    id: bigint;
    content: string;
    distance: number;
}
export declare class DocumentChunkRepository {
    private readonly prisma;
    constructor(prisma: PrismaService);
    replaceChunks(documentId: number, chunks: Array<{
        ordinal: number;
        content: string;
        tokenCount: number;
        embeddingLiteral: string;
    }>): Promise<void>;
    deleteManyByDocument(documentId: number): Promise<void>;
    insertChunk(input: {
        documentId: number;
        ordinal: number;
        content: string;
        tokenCount: number;
        embeddingLiteral: string;
    }): Promise<void>;
    searchSimilarity(botId: number, embeddingLiteral: string, k: number): Promise<RetrievedChunkRow[]>;
}
