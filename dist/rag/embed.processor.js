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
var EmbedProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbedProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const bullmq_2 = require("bullmq");
const types_1 = require("../shared/types");
const domain_events_1 = require("../shared/events/domain-events");
const chunker_service_1 = require("./chunker.service");
const embedding_service_1 = require("./embedding.service");
const document_repository_1 = require("./repositories/document.repository");
const document_chunk_repository_1 = require("./repositories/document-chunk.repository");
let EmbedProcessor = EmbedProcessor_1 = class EmbedProcessor extends bullmq_1.WorkerHost {
    docRepo;
    chunkRepo;
    chunker;
    embeddings;
    events;
    logger = new common_1.Logger(EmbedProcessor_1.name);
    constructor(docRepo, chunkRepo, chunker, embeddings, events) {
        super();
        this.docRepo = docRepo;
        this.chunkRepo = chunkRepo;
        this.chunker = chunker;
        this.embeddings = embeddings;
        this.events = events;
    }
    async process(job) {
        const { documentId } = job.data;
        const doc = await this.docRepo.findById(documentId);
        if (!doc) {
            this.logger.warn(`Document ${documentId} missing — skipping embed job`);
            return;
        }
        const from = doc.status;
        try {
            const chunks = await this.chunker.chunk(doc.rawText);
            const chunkData = [];
            if (chunks.length > 0) {
                const vectors = await this.embeddings.embedBatch(chunks.map((c) => c.content));
                for (let i = 0; i < chunks.length; i++) {
                    const c = chunks[i];
                    const vec = vectors[i];
                    const literal = `[${vec.join(',')}]`;
                    chunkData.push({
                        ordinal: c.ordinal,
                        content: c.content,
                        tokenCount: c.tokenCount,
                        embeddingLiteral: literal,
                    });
                }
            }
            await this.chunkRepo.replaceChunks(documentId, chunkData);
            const updated = await this.docRepo.update(documentId, { status: 'embedded' });
            this.events.emit(domain_events_1.DOMAIN_EVENTS.DocumentStatusChanged, {
                document: updated,
                from,
                to: 'embedded',
            });
        }
        catch (err) {
            const updated = await this.docRepo.update(documentId, { status: 'failed' });
            this.events.emit(domain_events_1.DOMAIN_EVENTS.DocumentStatusChanged, {
                document: updated,
                from,
                to: 'failed',
                error: err.message,
            });
            throw err;
        }
    }
    onFailed(job, err) {
        this.logger.error(`embed job ${job.id} (attempts=${job.attemptsMade}) failed: ${err.message}`);
    }
};
exports.EmbedProcessor = EmbedProcessor;
__decorate([
    (0, bullmq_1.OnWorkerEvent)('failed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bullmq_2.Job, Error]),
    __metadata("design:returntype", void 0)
], EmbedProcessor.prototype, "onFailed", null);
exports.EmbedProcessor = EmbedProcessor = EmbedProcessor_1 = __decorate([
    (0, bullmq_1.Processor)(types_1.RAG_EMBED_QUEUE, { concurrency: 2 }),
    __metadata("design:paramtypes", [document_repository_1.DocumentRepository,
        document_chunk_repository_1.DocumentChunkRepository,
        chunker_service_1.ChunkerService,
        embedding_service_1.EmbeddingService,
        event_emitter_1.EventEmitter2])
], EmbedProcessor);
//# sourceMappingURL=embed.processor.js.map