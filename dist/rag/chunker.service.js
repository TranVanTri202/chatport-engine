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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChunkerService = void 0;
const common_1 = require("@nestjs/common");
const textsplitters_1 = require("@langchain/textsplitters");
const APPROX_CHARS_PER_TOKEN = 4;
const TARGET_TOKENS = 500;
const OVERLAP_TOKENS = 50;
let ChunkerService = class ChunkerService {
    splitter;
    constructor() {
        this.splitter = new textsplitters_1.RecursiveCharacterTextSplitter({
            chunkSize: TARGET_TOKENS * APPROX_CHARS_PER_TOKEN,
            chunkOverlap: OVERLAP_TOKENS * APPROX_CHARS_PER_TOKEN,
        });
    }
    async chunk(rawText) {
        const normalized = rawText.replace(/\r\n?/g, '\n').trim();
        if (!normalized)
            return [];
        const parts = await this.splitter.splitText(normalized);
        return parts.map((content, idx) => ({
            ordinal: idx,
            content,
            tokenCount: Math.ceil(content.length / APPROX_CHARS_PER_TOKEN),
        }));
    }
};
exports.ChunkerService = ChunkerService;
exports.ChunkerService = ChunkerService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], ChunkerService);
//# sourceMappingURL=chunker.service.js.map