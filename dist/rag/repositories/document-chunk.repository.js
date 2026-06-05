"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentChunkRepository = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../shared/prisma/prisma.service");
let DocumentChunkRepository = class DocumentChunkRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async replaceChunks(documentId, chunks) {
        if (chunks.length === 0) {
            await this.prisma.documentChunk.deleteMany({ where: { documentId } });
            return;
        }
        const valueSqls = chunks.map((c) => client_1.Prisma.sql `(${documentId}, ${c.ordinal}, ${c.content}, ${c.tokenCount}, ${c.embeddingLiteral}::vector)`);
        await this.prisma.$transaction([
            this.prisma.documentChunk.deleteMany({ where: { documentId } }),
            this.prisma.$executeRaw `
        INSERT INTO "DocumentChunk" ("documentId", "ordinal", "content", "tokenCount", "embedding")
        VALUES ${client_1.Prisma.join(valueSqls)}
      `
        ]);
    }
    async deleteManyByDocument(documentId) {
        await this.prisma.documentChunk.deleteMany({
            where: { documentId },
        });
    }
    async insertChunk(input) {
        await this.prisma.$executeRaw `
      INSERT INTO "DocumentChunk" ("documentId", "ordinal", "content", "tokenCount", "embedding")
      VALUES (${input.documentId}, ${input.ordinal}, ${input.content}, ${input.tokenCount}, ${input.embeddingLiteral}::vector)
    `;
    }
    async searchSimilarity(botId, embeddingLiteral, k) {
        return this.prisma.$queryRaw `
      SELECT dc.id, dc.content, dc.embedding <=> ${embeddingLiteral}::vector AS distance
      FROM "DocumentChunk" dc
      JOIN "Document" d ON d.id = dc."documentId"
      WHERE d."botId" = ${botId}
      ORDER BY distance ASC
      LIMIT ${k}
    `;
    }
};
exports.DocumentChunkRepository = DocumentChunkRepository;
exports.DocumentChunkRepository = DocumentChunkRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DocumentChunkRepository);
//# sourceMappingURL=document-chunk.repository.js.map