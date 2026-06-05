import { AppConfig } from '@/shared/config/app.config';
import { RedisService } from '@/shared/redis/redis.service';
export declare class EmbeddingService {
    private readonly config;
    private readonly redis;
    private readonly logger;
    private readonly embeddings;
    constructor(config: AppConfig, redis: RedisService);
    embedQuery(query: string): Promise<number[]>;
    embedBatch(inputs: string[]): Promise<number[][]>;
}
