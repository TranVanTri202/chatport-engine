import { Injectable, Logger } from '@nestjs/common';
import { OpenAIEmbeddings } from '@langchain/openai';
import { AppConfig } from '@/shared/config/app.config';
import { RedisService } from '@/shared/redis/redis.service';
import { sha1Hex } from '@/shared/utils/timeout';

const QUERY_CACHE_TTL_SEC = 60;
const BATCH_SIZE = 100;

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly embeddings: OpenAIEmbeddings;

  constructor(
    private readonly config: AppConfig,
    private readonly redis: RedisService,
  ) {
    this.embeddings = new OpenAIEmbeddings({
      apiKey: config.openAiKey,
      model: config.embeddingModel,
      // LangChain's own batching — keep aligned with our per-call slice size.
      batchSize: BATCH_SIZE,
    });
  }

  async embedQuery(query: string): Promise<number[]> {
    const model = this.config.embeddingModel;
    const dims = this.config.embeddingDims;
    const key = `embed:q:${model}:${dims}:${sha1Hex(query)}`;
    const cached = await this.redis.cacheGet<number[]>(key);
    if (cached) return cached;

    const vec = await this.embeddings.embedQuery(query);
    await this.redis.cacheSet(key, vec, QUERY_CACHE_TTL_SEC);
    return vec;
  }

  /** Batched — used by ingestion worker. LangChain handles internal chunking. */
  async embedBatch(inputs: string[]): Promise<number[][]> {
    if (inputs.length === 0) return [];
    return this.embeddings.embedDocuments(inputs);
  }
}
