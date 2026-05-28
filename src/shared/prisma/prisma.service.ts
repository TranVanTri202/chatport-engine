import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    const maxAttempts = 10;
    const baseDelayMs = 1000;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await this.$connect();
        this.logger.log('Prisma connected');
        return;
      } catch (error) {
        if (attempt === maxAttempts) {
          this.logger.error('Failed to connect to the database after multiple attempts', error as Error);
          throw error;
        }

        const delayMs = baseDelayMs * attempt;
        this.logger.warn(
          `Database connection failed (attempt ${attempt}/${maxAttempts}). Retrying in ${delayMs}ms...`,
        );
        await sleep(delayMs);
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
