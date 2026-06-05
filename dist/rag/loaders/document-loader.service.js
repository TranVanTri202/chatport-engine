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
var DocumentLoaderService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentLoaderService = void 0;
const common_1 = require("@nestjs/common");
const file_loader_service_1 = require("./file-loader.service");
const google_docs_loader_service_1 = require("./google-docs-loader.service");
let DocumentLoaderService = DocumentLoaderService_1 = class DocumentLoaderService {
    file;
    google;
    logger = new common_1.Logger(DocumentLoaderService_1.name);
    constructor(file, google) {
        this.file = file;
        this.google = google;
    }
    async loadFile(input) {
        const loaded = await this.file.load(input);
        return { ...loaded, source: input.filename };
    }
    async loadUrl(url) {
        if (this.google.isGoogleUrl(url)) {
            return this.google.load(url);
        }
        throw new common_1.BadRequestException('Only Google Docs/Sheets URLs are supported for now');
    }
};
exports.DocumentLoaderService = DocumentLoaderService;
exports.DocumentLoaderService = DocumentLoaderService = DocumentLoaderService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [file_loader_service_1.FileLoaderService,
        google_docs_loader_service_1.GoogleDocsLoaderService])
], DocumentLoaderService);
//# sourceMappingURL=document-loader.service.js.map