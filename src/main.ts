import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Logger as PinoLogger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { AppConfig } from '@/shared/config/app.config';
import { installBigIntJsonSerializer } from '@/shared/utils/bigint-serializer';
import { setupSwagger } from '@/shared/swagger/swagger';

installBigIntJsonSerializer();

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'REDIS_URL',
  'OPENAI_API_KEY',
  'FIREBASE_PROJECT_ID',
  'JWT_SECRET',
  'LLM_MODEL',
  'LLM_TEMPERATURE',
  'LLM_MAX_TOKENS',
  'LLM_TOP_P',
  'LLM_FREQUENCY_PENALTY',
  'LLM_PRESENCE_PENALTY',
  'EMBEDDING_MODEL',
  'EMBEDDING_DIMS',
  'RAG_TOP_K',
  'SOCKET_CORS_ORIGIN',
  'LOG_LEVEL',
] as const;

function assertRequiredEnvVars(): void {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]?.trim());

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

async function bootstrap(): Promise<void> {
  assertRequiredEnvVars();

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(PinoLogger));

  const config = app.get(AppConfig);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableCors({ origin: config.socketCorsOrigin, credentials: true });
  app.enableShutdownHooks();

  setupSwagger(app);

  await app.listen(config.port);

  // eslint-disable-next-line no-console
  console.log(`🚀 Listening on http://localhost:${config.port}  ·  Swagger: /docs`);
}

void bootstrap();
