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
exports.DocumentService = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const bullmq_2 = require("bullmq");
const types_1 = require("../shared/types");
const bot_service_1 = require("../bot/bot.service");
const document_loader_service_1 = require("./loaders/document-loader.service");
const document_repository_1 = require("./repositories/document.repository");
let DocumentService = class DocumentService {
    repo;
    loader;
    bots;
    queue;
    constructor(repo, loader, bots, queue) {
        this.repo = repo;
        this.loader = loader;
        this.bots = bots;
        this.queue = queue;
    }
    async list(channel, externalId) {
        const bot = await this.bots.getByExternal(channel, externalId);
        return this.repo.findManyByBot(bot.id);
    }
    async ingest(dto) {
        const bot = await this.bots.getByExternal(dto.channel, dto.externalId);
        return this.create({
            botId: bot.id,
            title: dto.title,
            source: dto.source,
            mimeType: dto.mimeType,
            rawText: dto.rawText,
        });
    }
    async ingestFromFile(input) {
        const loaded = await this.loader.loadFile({
            filename: input.file.originalname,
            mimeType: input.file.mimetype,
            buffer: input.file.buffer,
        });
        const bot = await this.bots.getByExternal(input.channel, input.externalId);
        return this.create({
            botId: bot.id,
            title: input.overrideTitle ?? loaded.title,
            source: loaded.source,
            mimeType: loaded.mimeType,
            rawText: loaded.rawText,
        });
    }
    async ingestFromUrl(input) {
        const loaded = await this.loader.loadUrl(input.url);
        const bot = await this.bots.getByExternal(input.channel, input.externalId);
        return this.create({
            botId: bot.id,
            title: input.overrideTitle ?? loaded.title,
            source: loaded.source,
            mimeType: loaded.mimeType,
            rawText: loaded.rawText,
        });
    }
    async delete(id) {
        await this.repo.delete(id);
    }
    async reembed(id) {
        await this.repo.update(id, { status: 'pending' });
        await this.enqueue(id, `embed:${id}:${Date.now()}`);
    }
    async create(input) {
        const doc = await this.repo.create({
            botId: input.botId,
            title: input.title,
            source: input.source,
            mimeType: input.mimeType,
            rawText: input.rawText,
            status: 'pending',
        });
        await this.enqueue(doc.id, `embed:${doc.id}`);
        return doc;
    }
    async enqueue(documentId, jobId) {
        await this.queue.add('embed', { documentId }, { jobId, removeOnComplete: 100, removeOnFail: 200 });
    }
};
exports.DocumentService = DocumentService;
exports.DocumentService = DocumentService = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, bullmq_1.InjectQueue)(types_1.RAG_EMBED_QUEUE)),
    __metadata("design:paramtypes", [document_repository_1.DocumentRepository,
        document_loader_service_1.DocumentLoaderService,
        bot_service_1.BotService,
        bullmq_2.Queue])
], DocumentService);
//# sourceMappingURL=document.service.js.map