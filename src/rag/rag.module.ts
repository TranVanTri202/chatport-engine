import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { RAG_EMBED_QUEUE } from '@/shared/types';
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

@Module({
  imports: [BullModule.registerQueue({ name: RAG_EMBED_QUEUE })],
  controllers: [DocumentsController],
  providers: [
    ChunkerService,
    EmbeddingService,
    DocumentService,
    DocumentRepository,
    EmbedProcessor,
    RetrievalService,
    FileLoaderService,
    GoogleDocsLoaderService,
    DocumentLoaderService,
  ],
  exports: [EmbeddingService, RetrievalService, DocumentService],
})
export class RagModule {}
