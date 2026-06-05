"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RagModule = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const types_1 = require("../shared/types");
const bot_module_1 = require("../bot/bot.module");
const chunker_service_1 = require("./chunker.service");
const document_service_1 = require("./document.service");
const documents_controller_1 = require("./documents.controller");
const embed_processor_1 = require("./embed.processor");
const embedding_service_1 = require("./embedding.service");
const retrieval_service_1 = require("./retrieval.service");
const document_loader_service_1 = require("./loaders/document-loader.service");
const file_loader_service_1 = require("./loaders/file-loader.service");
const google_docs_loader_service_1 = require("./loaders/google-docs-loader.service");
const document_repository_1 = require("./repositories/document.repository");
const document_chunk_repository_1 = require("./repositories/document-chunk.repository");
let RagModule = class RagModule {
};
exports.RagModule = RagModule;
exports.RagModule = RagModule = __decorate([
    (0, common_1.Module)({
        imports: [bullmq_1.BullModule.registerQueue({ name: types_1.RAG_EMBED_QUEUE }), (0, common_1.forwardRef)(() => bot_module_1.BotModule)],
        controllers: [documents_controller_1.DocumentsController],
        providers: [
            chunker_service_1.ChunkerService,
            embedding_service_1.EmbeddingService,
            document_service_1.DocumentService,
            document_repository_1.DocumentRepository,
            document_chunk_repository_1.DocumentChunkRepository,
            embed_processor_1.EmbedProcessor,
            retrieval_service_1.RetrievalService,
            file_loader_service_1.FileLoaderService,
            google_docs_loader_service_1.GoogleDocsLoaderService,
            document_loader_service_1.DocumentLoaderService,
        ],
        exports: [embedding_service_1.EmbeddingService, retrieval_service_1.RetrievalService, document_service_1.DocumentService, document_repository_1.DocumentRepository, document_chunk_repository_1.DocumentChunkRepository],
    })
], RagModule);
//# sourceMappingURL=rag.module.js.map