import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { EmbeddingService } from './embedding.service';

export interface RetrievedChunk {
  id: string; // bigint as string
  content: string;
  score: number; // 1 - cosine distance
}

interface ChunkRow {
  id: bigint;
  content: string;
  distance: number;
}

@Injectable()
export class RetrievalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddings: EmbeddingService,
  ) {}

  async search(botId: number, query: string, k = 5): Promise<RetrievedChunk[]> {
    const vec = await this.embeddings.embedQuery(query);
    const literal = `[${vec.join(',')}]`;

    const rows = await this.prisma.$queryRaw<ChunkRow[]>`
      SELECT dc.id, dc.content, dc.embedding <=> ${literal}::vector AS distance
      FROM "DocumentChunk" dc
      JOIN "BotDocument" bd ON bd."documentId" = dc."documentId"
      WHERE bd."botId" = ${botId}
      ORDER BY distance ASC
      LIMIT ${k}
    `;

    return rows.map((r) => ({
      id: r.id.toString(),
      content: r.content,
      score: 1 - Number(r.distance),
    }));
  }
}
