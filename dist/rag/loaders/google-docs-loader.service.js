"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var GoogleDocsLoaderService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleDocsLoaderService = void 0;
const common_1 = require("@nestjs/common");
const FETCH_TIMEOUT_MS = 20_000;
const ACCESS_CHECK_TIMEOUT_MS = 5_000;
const MAX_BYTES = 10 * 1024 * 1024;
let GoogleDocsLoaderService = GoogleDocsLoaderService_1 = class GoogleDocsLoaderService {
    logger = new common_1.Logger(GoogleDocsLoaderService_1.name);
    isGoogleUrl(url) {
        try {
            return new URL(url).hostname.endsWith('docs.google.com');
        }
        catch {
            return false;
        }
    }
    async load(url) {
        const parsed = this.parse(url);
        const access = await this.checkAccess(url);
        if (access !== 'public' && access !== 'anyone_with_link') {
            throw new common_1.BadRequestException('Google Docs/Sheets link must be published or shared "anyone with the link" before importing.');
        }
        const exportUrl = this.buildExportUrl(parsed);
        const text = await this.fetchText(exportUrl);
        return {
            rawText: text,
            mimeType: parsed.kind === 'docs'
                ? 'application/vnd.google-apps.document'
                : 'application/vnd.google-apps.spreadsheet',
            title: this.titleFromParsed(parsed),
            source: url,
        };
    }
    parse(rawUrl) {
        let url;
        try {
            url = new URL(rawUrl);
        }
        catch {
            throw new common_1.BadRequestException('Invalid URL');
        }
        if (!url.hostname.endsWith('docs.google.com')) {
            throw new common_1.BadRequestException('Not a Google Docs/Sheets URL (host must be docs.google.com)');
        }
        const docsMatch = url.pathname.match(/^\/document\/d\/([^/]+)/);
        if (docsMatch?.[1]) {
            return { kind: 'docs', id: docsMatch[1] };
        }
        const sheetsMatch = url.pathname.match(/^\/spreadsheets\/d\/([^/]+)/);
        if (sheetsMatch?.[1]) {
            const gidFromHash = url.hash.match(/gid=(\d+)/)?.[1];
            const gidFromQuery = url.searchParams.get('gid') ?? undefined;
            return {
                kind: 'sheets',
                id: sheetsMatch[1],
                gid: gidFromQuery ?? gidFromHash ?? '0',
            };
        }
        throw new common_1.BadRequestException('URL must be /document/d/{ID}/... or /spreadsheets/d/{ID}/...');
    }
    buildExportUrl(p) {
        if (p.kind === 'docs') {
            return `https://docs.google.com/document/d/${p.id}/export?format=txt`;
        }
        return `https://docs.google.com/spreadsheets/d/${p.id}/export?format=csv&gid=${p.gid ?? '0'}`;
    }
    titleFromParsed(p) {
        return p.kind === 'docs' ? `GDoc ${p.id}` : `GSheet ${p.id}/${p.gid ?? '0'}`;
    }
    async checkAccess(url) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), ACCESS_CHECK_TIMEOUT_MS);
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        };
        try {
            const res = await fetch(url, {
                signal: controller.signal,
                headers,
                redirect: 'follow',
            });
            if (res.status === 429)
                return 'rate_limited';
            if (res.status === 401 || res.status === 403)
                return 'private';
            const text = await res.text();
            const lower = `${this.extractTitle(text)}\n${text}`.toLowerCase();
            const privateIndicators = [
                'you need permission',
                'bạn cần quyền truy cập',
                'request access',
                'yêu cầu quyền truy cập',
                'access denied',
                'quyền truy cập bị từ chối',
                'sign in',
                'đăng nhập',
            ];
            const looksPrivate = privateIndicators.some((indicator) => lower.includes(indicator));
            if (looksPrivate)
                return 'private';
            return 'public';
        }
        catch (error) {
            if (error.name === 'AbortError')
                return 'request_timeout';
            return 'error_checking_access';
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
    extractTitle(html) {
        const match = html.match(/<title[^>]*>(.*?)<\/title>/is);
        return match?.[1] ?? '';
    }
    async fetchText(url) {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
        try {
            const res = await fetch(url, {
                signal: controller.signal,
                redirect: 'follow',
            });
            if (!res.ok) {
                throw new common_1.BadRequestException(`Google export failed (${res.status}). Check that the document is shared "anyone with the link".`);
            }
            const ct = res.headers.get('content-type') ?? '';
            if (ct.startsWith('text/html')) {
                throw new common_1.BadRequestException('Got an HTML login page — document is likely not public.');
            }
            const buf = Buffer.from(await res.arrayBuffer());
            if (buf.byteLength > MAX_BYTES) {
                throw new common_1.BadRequestException(`Document too large (>${MAX_BYTES} bytes)`);
            }
            return buf.toString('utf8');
        }
        finally {
            clearTimeout(t);
        }
    }
};
exports.GoogleDocsLoaderService = GoogleDocsLoaderService;
exports.GoogleDocsLoaderService = GoogleDocsLoaderService = GoogleDocsLoaderService_1 = __decorate([
    (0, common_1.Injectable)()
], GoogleDocsLoaderService);
//# sourceMappingURL=google-docs-loader.service.js.map