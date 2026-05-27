import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Job } from 'bullmq';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { RAG_EMBED_QUEUE } from '@/shared/types';
import {
  DOMAIN_EVENTS,
  DocumentStatusChangedEvent,
} from '@/shared/events/domain-events';
import { ChunkerService } from './chunker.service';
import { EmbeddingService } from './embedding.service';
import { EmbedDocumentJob } from './document.service';

@Processor(RAG_EMBED_QUEUE, { concurrency: 2 })
export class EmbedProcessor extends WorkerHost {
  private readonly logger = new Logger(EmbedProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly chunker: ChunkerService,
    private readonly embeddings: EmbeddingService,
    private readonly events: EventEmitter2,
  ) {
    super();
  }

  async process(job: Job<EmbedDocumentJob>): Promise<void> {
    const { documentId } = job.data;
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
    });
    if (!doc) {
      this.logger.warn(`Document ${documentId} missing — skipping embed job`);
      return;
    }

    const from = doc.status;
    try {
      await this.prisma.documentChunk.deleteMany({ where: { documentId } });

      const chunks = await this.chunker.chunk(doc.rawText);
      if (chunks.length > 0) {
        const vectors = await this.embeddings.embedBatch(
          chunks.map((c) => c.content),
        );
        for (let i = 0; i < chunks.length; i++) {
          const c = chunks[i]!;
          const vec = vectors[i]!;
          const literal = `[${vec.join(',')}]`;
          await this.prisma.$executeRaw`
            INSERT INTO "DocumentChunk" ("documentId","ordinal","content","tokenCount","embedding")
            VALUES (${documentId}, ${c.ordinal}, ${c.content}, ${c.tokenCount}, ${literal}::vector)
          `;
        }
      }

      const updated = await this.prisma.document.update({
        where: { id: documentId },
        data: { status: 'embedded' },
      });
      this.events.emit(DOMAIN_EVENTS.DocumentStatusChanged, {
        document: updated,
        from,
        to: 'embedded',
      } satisfies DocumentStatusChangedEvent);
    } catch (err) {
      const updated = await this.prisma.document.update({
        where: { id: documentId },
        data: { status: 'failed' },
      });
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
