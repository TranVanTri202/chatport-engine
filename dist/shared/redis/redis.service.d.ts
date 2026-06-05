import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { AppConfig } from '../config/app.config';
export declare class RedisService implements OnModuleInit, OnModuleDestroy {
    private readonly config;
    private readonly logger;
    private client;
    constructor(config: AppConfig);
    onModuleInit(): void;
    onModuleDestroy(): Promise<void>;
    get raw(): Redis;
    acquireLock(key: string, token: string, ttlMs: number): Promise<boolean>;
    releaseLock(key: string, token: string): Promise<boolean>;
    cacheGet<T>(key: string): Promise<T | null>;
    cacheSet(key: string, value: unknown, ttlSec: number): Promise<void>;
}
