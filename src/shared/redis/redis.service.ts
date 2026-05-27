import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { AppConfig } from '../config/app.config';

const RELEASE_LOCK_LUA = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;

  constructor(private readonly config: AppConfig) {}

  onModuleInit(): void {
    this.client = new Redis(this.config.redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
    });
    this.client.on('error', (err) => this.logger.error(`Redis error: ${err.message}`));
    this.client.on('ready', () => this.logger.log('Redis ready'));
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) await this.client.quit();
  }

  get raw(): Redis {
    return this.client;
  }

  async acquireLock(key: string, token: string, ttlMs: number): Promise<boolean> {
    const res = await this.client.set(key, token, 'PX', ttlMs, 'NX');
    return res === 'OK';
  }

  async releaseLock(key: string, token: string): Promise<boolean> {
    const res = (await this.client.eval(RELEASE_LOCK_LUA, 1, key, token)) as number;
    return res === 1;
  }

  async cacheGet<T>(key: string): Promise<T | null> {
    const v = await this.client.get(key);
    return v ? (JSON.parse(v) as T) : null;
  }

  async cacheSet(key: string, value: unknown, ttlSec: number): Promise<void> {
    await this.client.set(key, JSON.stringify(value), 'EX', ttlSec);
  }
}
