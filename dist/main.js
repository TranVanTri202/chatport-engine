"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const nestjs_pino_1 = require("nestjs-pino");
const app_module_1 = require("./app.module");
const app_config_1 = require("./shared/config/app.config");
const bigint_serializer_1 = require("./shared/utils/bigint-serializer");
const swagger_1 = require("./shared/swagger/swagger");
(0, bigint_serializer_1.installBigIntJsonSerializer)();
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, { bufferLogs: true });
    app.useLogger(app.get(nestjs_pino_1.Logger));
    app.setGlobalPrefix('api/v1');
    const config = app.get(app_config_1.AppConfig);
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
    }));
    app.enableCors({ origin: config.socketCorsOrigin, credentials: true });
    app.enableShutdownHooks();
    (0, swagger_1.setupSwagger)(app);
    await app.listen(config.port);
    console.log(`🚀 Listening on http://localhost:${config.port}  ·  Swagger: /docs`);
}
void bootstrap();
//# sourceMappingURL=main.js.map