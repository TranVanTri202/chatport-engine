import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Logger as PinoLogger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { AppConfig } from '@/shared/config/app.config';
import { installBigIntJsonSerializer } from '@/shared/utils/bigint-serializer';
import { setupSwagger } from '@/shared/swagger/swagger';

installBigIntJsonSerializer();

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(PinoLogger));

  app.setGlobalPrefix('api/v1');

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
