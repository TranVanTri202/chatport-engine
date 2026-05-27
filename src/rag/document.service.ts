import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { Document } from '@prisma/client';
import { RAG_EMBED_QUEUE } from '@/shared/types';
import { IngestDocumentDto } from './dto/ingest-document.dto';
import { DocumentLoaderService } from './loaders/document-loader.service';
import { DocumentRepository } from './repositories/document.repository';

export interface EmbedDocumentJob {
  documentId: number;
}

@Injectable()
export class DocumentService {
  constructor(
    private readonly repo: DocumentRepository,
    private readonly loader: DocumentLoaderService,
    @InjectQueue(RAG_EMBED_QUEUE) private readonly queue: Queue<EmbedDocumentJob>,
  ) {}

  list(customerId: number): Promise<Document[]> {
    return this.repo.findManyByCustomer(customerId);
  }

  async ingest(dto: IngestDocumentDto): Promise<Document> {
    return this.create({
      customerId: dto.customerId,
      title: dto.title,
      source: dto.source,
      mimeType: dto.mimeType,
      rawText: dto.rawText,
    });
  }

  async ingestFromFile(input: {
    customerId: number;
    overrideTitle?: string;
    file: { originalname: string; mimetype: string; buffer: Buffer };
  }): Promise<Document> {
    const loaded = await this.loader.loadFile({
      filename: input.file.originalname,
      mimeType: input.file.mimetype,
      buffer: input.file.buffer,
    });
    return this.create({
      customerId: input.customerId,
      title: input.overrideTitle ?? loaded.title,
      source: loaded.source,
      mimeType: loaded.mimeType,
      rawText: loaded.rawText,
    });
  }

  async ingestFromUrl(input: {
    customerId: number;
    url: string;
    overrideTitle?: string;
  }): Promise<Document> {
    const loaded = await this.loader.loadUrl(input.url);
    return this.create({
      customerId: input.customerId,
      title: input.overrideTitle ?? loaded.title,
      source: loaded.source,
      mimeType: loaded.mimeType,
      rawText: loaded.rawText,
    });
  }

  async delete(id: number): Promise<void> {
    await this.repo.delete(id);
  }

  async reembed(id: number): Promise<void> {
    await this.repo.update(id, { status: 'pending' });
    await this.enqueue(id, `embed:${id}:${Date.now()}`);
  }

  private async create(input: {
    customerId: number;
    title: string;
    source?: string;
    mimeType?: string;
    rawText: string;
  }): Promise<Document> {
    const doc = await this.repo.create({
      customerId: input.customerId,
      title: input.title,
      source: input.source,
      mimeType: input.mimeType,
      rawText: input.rawText,
      status: 'pending',
    });
    await this.enqueue(doc.id, `embed:${doc.id}`);
    return doc;
  }

  private async enqueue(documentId: number, jobId: string): Promise<void> {
    await this.queue.add(
      'embed',
      { documentId },
      { jobId, removeOnComplete: 100, removeOnFail: 200 },
    );
  }
}
