"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSwagger = setupSwagger;
const swagger_1 = require("@nestjs/swagger");
function setupSwagger(app) {
    const config = new swagger_1.DocumentBuilder()
        .setTitle('AseBase Zalo API')
        .setDescription('Multi-channel bot backend. Channel-agnostic core + Zalo adapter + RAG over pgvector.')
        .setVersion('0.1.0')
        .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'jwt')
        .addTag('auth')
        .addTag('bots')
        .addTag('channels')
        .addTag('messages')
        .addTag('documents')
        .addTag('prompts')
        .addTag('health')
        .build();
    const doc = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('docs', app, doc, {
        swaggerOptions: { persistAuthorization: true },
    });
}
//# sourceMappingURL=swagger.js.map