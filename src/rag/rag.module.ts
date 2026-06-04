import { BullModule } from '@nestjs/bullmq';
import { forwardRef, Module } from '@nestjs/common';
import { RAG_EMBED_QUEUE } from '@/shared/types';
import { BotModule } from '@/bot/bot.module';
import { ChunkerService } from './chunker.service';
import { DocumentService } from './document.service';
import { DocumentsController } from './documents.controller';
import { EmbedProcessor } from './embed.processor';
import { EmbeddingService } from './embedding.service';
import { RetrievalService } from './retrieval.service';
import { DocumentLoaderService } from './loaders/document-loader.service';
import { FileLoaderService } from './loaders/file-loader.service';
import { GoogleDocsLoaderService } from './loaders/google-docs-loader.service';
import { DocumentRepository } from './repositories/document.repository';
import { DocumentChunkRepository } from './repositories/document-chunk.repository';

@Module({
  imports: [BullModule.registerQueue({ name: RAG_EMBED_QUEUE }), forwardRef(() => BotModule)],
  controllers: [DocumentsController],
  providers: [
    ChunkerService,
    EmbeddingService,
    DocumentService,
    DocumentRepository,
    DocumentChunkRepository,
    EmbedProcessor,
    RetrievalService,
    FileLoaderService,
    GoogleDocsLoaderService,
    DocumentLoaderService,
  ],
  exports: [EmbeddingService, RetrievalService, DocumentService, DocumentRepository, DocumentChunkRepository],
})
export class RagModule {}
