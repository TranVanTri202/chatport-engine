import { Injectable, Logger } from '@nestjs/common';
import { EmbeddingService } from './embedding.service';
import { DocumentChunkRepository } from './repositories/document-chunk.repository';

export interface RetrievedChunk {
  id: string;
  content: string;
  /** 1 - cosine distance. 1.0 = identical, 0.0 = orthogonal. */
  score: number;
  documentTitle: string | null;
  documentSource: string | null;
}

const DEFAULT_TOP_K = 5;
const MIN_SCORE = 0.5;

/**
 * Vector similarity search with score threshold and document metadata.
 *
 * Each chunk is enriched with its parent document title + source so the LLM
 * can attribute answers. Chunks below the score threshold are discarded to
 * reduce noise and save context-window tokens.
 */
@Injectable()
export class RetrievalService {
  private readonly logger = new Logger(RetrievalService.name);

  constructor(
    private readonly embeddings: EmbeddingService,
    private readonly chunkRepo: DocumentChunkRepository,
  ) {}

  async search(
    botId: number,
    query: string,
    k = DEFAULT_TOP_K,
  ): Promise<RetrievedChunk[]> {
    const vec = await this.embeddings.embedQuery(query);
    const literal = `[${vec.join(',')}]`;

    const rows = await this.chunkRepo.searchSimilarity(
      botId,
      literal,
      k,
      MIN_SCORE,
    );

    if (rows.length === 0) {
      this.logger.debug(`No relevant chunks found for botId=${botId}`);
    }

    return rows.map((r) => ({
      id: r.id.toString(),
      content: r.content,
      score: 1 - Number(r.distance),
      documentTitle: r.documentTitle,
      documentSource: r.documentSource,
    }));
  }

  /**
   * Format retrieved chunks into a single context string with document
   * attribution, ready for prompt injection.
   */
  formatContext(chunks: RetrievedChunk[]): string {
    if (chunks.length === 0) return '';

    // Group by document title for clean formatting
    const grouped = new Map<string, RetrievedChunk[]>();
    for (const c of chunks) {
      const key = c.documentTitle || c.documentSource || '(tài liệu không tên)';
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(c);
    }

    const parts: string[] = [];
    for (const [title, docs] of grouped) {
      const source = docs[0]!.documentSource;
      const header = source
        ? `[Tài liệu: ${title} — ${source}]`
        : `[Tài liệu: ${title}]`;
      parts.push(
        header + '\n' + docs.map((d) => d.content).join('\n---\n'),
      );
    }

    return parts.join('\n\n');
  }
}
