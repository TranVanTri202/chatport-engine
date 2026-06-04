import { Injectable } from '@nestjs/common';
import { EmbeddingService } from './embedding.service';
import { DocumentChunkRepository } from './repositories/document-chunk.repository';

export interface RetrievedChunk {
  id: string; // bigint as string
  content: string;
  score: number; // 1 - cosine distance
}

@Injectable()
export class RetrievalService {
  constructor(
    private readonly embeddings: EmbeddingService,
    private readonly chunkRepo: DocumentChunkRepository,
  ) {}

  async search(botId: number, query: string, k = 5): Promise<RetrievedChunk[]> {
    const vec = await this.embeddings.embedQuery(query);
    const literal = `[${vec.join(',')}]`;

    const rows = await this.chunkRepo.searchSimilarity(botId, literal, k);

    return rows.map((r) => ({
      id: r.id.toString(),
      content: r.content,
      score: 1 - Number(r.distance),
    }));
  }
}
