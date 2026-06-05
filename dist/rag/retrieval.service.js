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
exports.RetrievalService = void 0;
const common_1 = require("@nestjs/common");
const embedding_service_1 = require("./embedding.service");
const document_chunk_repository_1 = require("./repositories/document-chunk.repository");
let RetrievalService = class RetrievalService {
    embeddings;
    chunkRepo;
    constructor(embeddings, chunkRepo) {
        this.embeddings = embeddings;
        this.chunkRepo = chunkRepo;
    }
    async search(botId, query, k = 5) {
        const vec = await this.embeddings.embedQuery(query);
        const literal = `[${vec.join(',')}]`;
        const rows = await this.chunkRepo.searchSimilarity(botId, literal, k);
        return rows.map((r) => ({
            id: r.id.toString(),
            content: r.content,
            score: 1 - Number(r.distance),
        }));
    }
};
exports.RetrievalService = RetrievalService;
exports.RetrievalService = RetrievalService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [embedding_service_1.EmbeddingService,
        document_chunk_repository_1.DocumentChunkRepository])
], RetrievalService);
//# sourceMappingURL=retrieval.service.js.map