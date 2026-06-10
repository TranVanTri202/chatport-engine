import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/prisma/prisma.service';

export interface RetrievedChunkRow {
  id: bigint;
  content: string;
  distance: number;
  documentTitle: string | null;
  documentSource: string | null;
}

@Injectable()
export class DocumentChunkRepository {
  constructor(private readonly prisma: PrismaService) {}

  async replaceChunks(
    documentId: number,
    chunks: Array<{ ordinal: number; content: string; tokenCount: number; embeddingLiteral: string }>,
  ): Promise<void> {
    if (chunks.length === 0) {
      await this.prisma.documentChunk.deleteMany({ where: { documentId } });
      return;
    }
    const valueSqls = chunks.map(
      (c) => Prisma.sql`(${documentId}, ${c.ordinal}, ${c.content}, ${c.tokenCount}, ${c.embeddingLiteral}::vector)`
    );
    await this.prisma.$transaction([
      this.prisma.documentChunk.deleteMany({ where: { documentId } }),
      this.prisma.$executeRaw`
        INSERT INTO "DocumentChunk" ("documentId", "ordinal", "content", "tokenCount", "embedding")
        VALUES ${Prisma.join(valueSqls)}
      `
    ]);
  }

  async deleteManyByDocument(documentId: number): Promise<void> {
    await this.prisma.documentChunk.deleteMany({
      where: { documentId },
    });
  }

  async insertChunk(input: {
    documentId: number;
    ordinal: number;
    content: string;
    tokenCount: number;
    embeddingLiteral: string;
  }): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO "DocumentChunk" ("documentId", "ordinal", "content", "tokenCount", "embedding")
      VALUES (${input.documentId}, ${input.ordinal}, ${input.content}, ${input.tokenCount}, ${input.embeddingLiteral}::vector)
    `;
  }

  async searchSimilarity(
    botId: number,
    embeddingLiteral: string,
    k: number,
    minScore = 0.5,
  ): Promise<RetrievedChunkRow[]> {
    return this.prisma.$queryRaw<RetrievedChunkRow[]>`
      SELECT dc.id, dc.content,
             dc.embedding <=> ${embeddingLiteral}::vector AS distance,
             d.title AS "documentTitle",
             d.source AS "documentSource"
      FROM "DocumentChunk" dc
      JOIN "Document" d ON d.id = dc."documentId"
      WHERE d."botId" = ${botId}
        AND dc.embedding <=> ${embeddingLiteral}::vector < ${1 - minScore}
      ORDER BY distance ASC
      LIMIT ${k}
    `;
  }
}
