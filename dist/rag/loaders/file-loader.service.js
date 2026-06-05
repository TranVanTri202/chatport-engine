"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var FileLoaderService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileLoaderService = void 0;
const common_1 = require("@nestjs/common");
const path = __importStar(require("node:path"));
const MAX_BUFFER_BYTES = 20 * 1024 * 1024;
let FileLoaderService = FileLoaderService_1 = class FileLoaderService {
    logger = new common_1.Logger(FileLoaderService_1.name);
    async load(input) {
        if (input.buffer.byteLength === 0) {
            throw new common_1.UnsupportedMediaTypeException('Empty file');
        }
        if (input.buffer.byteLength > MAX_BUFFER_BYTES) {
            throw new common_1.UnsupportedMediaTypeException(`File exceeds ${MAX_BUFFER_BYTES} bytes`);
        }
        const ext = path.extname(input.filename).toLowerCase().replace(/^\./, '');
        const kind = this.resolveKind(ext, input.mimeType);
        const title = path.basename(input.filename, path.extname(input.filename));
        switch (kind) {
            case 'pdf':
                return {
                    rawText: await this.loadPdf(input.buffer),
                    mimeType: 'application/pdf',
                    title,
                };
            case 'docx':
                return {
                    rawText: await this.loadDocx(input.buffer),
                    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    title,
                };
            case 'xlsx':
                return {
                    rawText: this.loadXlsx(input.buffer),
                    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    title,
                };
            case 'csv':
                return {
                    rawText: input.buffer.toString('utf8'),
                    mimeType: 'text/csv',
                    title,
                };
            case 'html':
                return {
                    rawText: this.stripHtml(input.buffer.toString('utf8')),
                    mimeType: 'text/html',
                    title,
                };
            case 'text':
            default:
                return {
                    rawText: input.buffer.toString('utf8'),
                    mimeType: input.mimeType ?? 'text/plain',
                    title,
                };
        }
    }
    resolveKind(ext, mime) {
        if (ext === 'pdf' || mime === 'application/pdf')
            return 'pdf';
        if (ext === 'docx' ||
            mime ===
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            return 'docx';
        }
        if (ext === 'xlsx' ||
            ext === 'xls' ||
            mime?.startsWith('application/vnd.ms-excel') ||
            mime ===
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
            return 'xlsx';
        }
        if (ext === 'csv' || mime === 'text/csv')
            return 'csv';
        if (ext === 'html' || ext === 'htm' || mime === 'text/html')
            return 'html';
        if (ext === 'txt' ||
            ext === 'md' ||
            ext === 'markdown' ||
            mime?.startsWith('text/')) {
            return 'text';
        }
        throw new common_1.UnsupportedMediaTypeException(`Unsupported file type: ext=.${ext} mime=${mime ?? 'unknown'}`);
    }
    async loadPdf(buf) {
        const pdfParse = require('pdf-parse/lib/pdf-parse.js');
        const out = await pdfParse(buf);
        return out.text ?? '';
    }
    async loadDocx(buf) {
        const mammoth = require('mammoth');
        const out = await mammoth.extractRawText({ buffer: buf });
        return out.value ?? '';
    }
    loadXlsx(buf) {
        const XLSX = require('xlsx');
        const wb = XLSX.read(buf, { type: 'buffer' });
        return wb.SheetNames.map((name) => {
            const sheet = wb.Sheets[name];
            if (!sheet)
                return '';
            const csv = XLSX.utils.sheet_to_csv(sheet);
            return `# Sheet: ${name}\n${csv}`;
        })
            .filter(Boolean)
            .join('\n\n');
    }
    stripHtml(html) {
        return html
            .replace(/<script[\s\S]*?<\/script>/gi, ' ')
            .replace(/<style[\s\S]*?<\/style>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }
};
exports.FileLoaderService = FileLoaderService;
exports.FileLoaderService = FileLoaderService = FileLoaderService_1 = __decorate([
    (0, common_1.Injectable)()
], FileLoaderService);
//# sourceMappingURL=file-loader.service.js.map