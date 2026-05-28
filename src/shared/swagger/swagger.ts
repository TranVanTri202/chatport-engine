import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
 * Mount OpenAPI at /docs. Reads class-validator decorators on DTOs to
 * generate request schemas automatically — `@ApiProperty()` only needed
 * when you want richer metadata (examples, deprecation, etc.).
 *
 * `bearer` security is wired up so the "Authorize" button in /docs accepts
 * the JWT from /auth/login.
 */
export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('AseBase Zalo API')
    .setDescription(
      'Multi-channel bot backend. Channel-agnostic core + Zalo adapter + RAG over pgvector.',
    )
    .setVersion('0.1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'jwt',
    )
    .addTag('auth')
    .addTag('bots')
    .addTag('channels')
    .addTag('messages')
    .addTag('documents')
    .addTag('prompts')
    .addTag('health')
    .build();

  const doc = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, doc, {
    swaggerOptions: { persistAuthorization: true },
  });
}
