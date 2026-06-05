"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const document_service_1 = require("./document.service");
const ingest_document_dto_1 = require("./dto/ingest-document.dto");
const import_url_dto_1 = require("./dto/import-url.dto");
const types_1 = require("../shared/types");
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
let DocumentsController = class DocumentsController {
    documents;
    constructor(documents) {
        this.documents = documents;
    }
    list(channel, externalId) {
        return this.documents.list(channel, externalId);
    }
    ingest(channel, externalId, body) {
        return this.documents.ingest({ ...body, channel, externalId });
    }
    upload(channel, externalId, body, file) {
        if (!file)
            throw new common_1.BadRequestException('file is required');
        return this.documents.ingestFromFile({
            channel,
            externalId,
            overrideTitle: body.title,
            file: {
                originalname: file.originalname,
                mimetype: file.mimetype,
                buffer: file.buffer,
            },
        });
    }
    importUrl(channel, externalId, body) {
        return this.documents.ingestFromUrl({
            channel,
            externalId,
            url: body.url,
            overrideTitle: body.title,
        });
    }
    async remove(id) {
        await this.documents.delete(id);
        return { ok: true };
    }
    async reembed(id) {
        await this.documents.reembed(id);
        return { ok: true };
    }
};
exports.DocumentsController = DocumentsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Param)('channel')),
    __param(1, (0, common_1.Param)('externalId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Param)('channel')),
    __param(1, (0, common_1.Param)('externalId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, ingest_document_dto_1.IngestDocumentBodyDto]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "ingest", null);
__decorate([
    (0, common_1.Post)('upload'),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            required: ['file'],
            properties: {
                file: { type: 'string', format: 'binary' },
                title: { type: 'string' },
            },
        },
    }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { limits: { fileSize: MAX_UPLOAD_BYTES } })),
    __param(0, (0, common_1.Param)('channel')),
    __param(1, (0, common_1.Param)('externalId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.UploadedFile)(new common_1.ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: MAX_UPLOAD_BYTES })
        .build({ fileIsRequired: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, import_url_dto_1.UploadDocumentMetaBodyDto, Object]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "upload", null);
__decorate([
    (0, common_1.Post)('import-url'),
    __param(0, (0, common_1.Param)('channel')),
    __param(1, (0, common_1.Param)('externalId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, import_url_dto_1.ImportUrlBodyDto]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "importUrl", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/reembed'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "reembed", null);
exports.DocumentsController = DocumentsController = __decorate([
    (0, swagger_1.ApiTags)('documents'),
    (0, swagger_1.ApiBearerAuth)('jwt'),
    (0, common_1.Controller)('bots/:channel/:externalId/documents'),
    __metadata("design:paramtypes", [document_service_1.DocumentService])
], DocumentsController);
//# sourceMappingURL=documents.controller.js.map