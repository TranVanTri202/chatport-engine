import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Job } from 'bullmq';
import { RAG_EMBED_QUEUE } from '@/shared/types';
import {
  DOMAIN_EVENTS,
  DocumentStatusChangedEvent,
} from '@/shared/events/domain-events';
import { ChunkerService } from './chunker.service';
import { EmbeddingService } from './embedding.service';
import { EmbedDocumentJob } from './document.service';
import { DocumentRepository } from './repositories/document.repository';
import { DocumentChunkRepository } from './repositories/document-chunk.repository';

@Processor(RAG_EMBED_QUEUE, { concurrency: 2 })
export class EmbedProcessor extends WorkerHost {
  private readonly logger = new Logger(EmbedProcessor.name);

  constructor(
    private readonly docRepo: DocumentRepository,
    private readonly chunkRepo: DocumentChunkRepository,
    private readonly chunker: ChunkerService,
    private readonly embeddings: EmbeddingService,
    private readonly events: EventEmitter2,
  ) {
    super();
  }

  async process(job: Job<EmbedDocumentJob>): Promise<void> {
    const { documentId } = job.data;
    const doc = await this.docRepo.findById(documentId);
    if (!doc) {
      this.logger.warn(`Document ${documentId} missing — skipping embed job`);
      return;
    }

    const from = doc.status;
    try {
      const chunks = await this.chunker.chunk(doc.rawText);
      const chunkData: Array<{
        ordinal: number;
        content: string;
        tokenCount: number;
        embeddingLiteral: string;
      }> = [];

      if (chunks.length > 0) {
        const vectors = await this.embeddings.embedBatch(
          chunks.map((c) => c.content),
        );
        for (let i = 0; i < chunks.length; i++) {
          const c = chunks[i]!;
          const vec = vectors[i]!;
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
      this.events.emit(DOMAIN_EVENTS.DocumentStatusChanged, {
        document: updated,
        from,
        to: 'embedded',
      } satisfies DocumentStatusChangedEvent);
    } catch (err) {
      const updated = await this.docRepo.update(documentId, { status: 'failed' });
      this.events.emit(DOMAIN_EVENTS.DocumentStatusChanged, {
        document: updated,
        from,
        to: 'failed',
        error: (err as Error).message,
      } satisfies DocumentStatusChangedEvent);
      throw err;
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<EmbedDocumentJob>, err: Error): void {
    this.logger.error(
      `embed job ${job.id} (attempts=${job.attemptsMade}) failed: ${err.message}`,
    );
  }
}
