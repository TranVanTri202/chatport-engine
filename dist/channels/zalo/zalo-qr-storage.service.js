"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZaloQrStorageService = void 0;
const common_1 = require("@nestjs/common");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
let ZaloQrStorageService = class ZaloQrStorageService {
    qrPath = (0, node_path_1.resolve)(process.env.ZALO_QR_PATH ?? './qr.png');
    qrDir = (0, node_path_1.dirname)(this.qrPath);
    ensureExists() {
        (0, node_fs_1.mkdirSync)(this.qrDir, { recursive: true });
    }
    getQrPath() {
        return this.qrPath;
    }
    getQrDir() {
        return this.qrDir;
    }
    getRootDir() {
        return this.qrDir;
    }
};
exports.ZaloQrStorageService = ZaloQrStorageService;
exports.ZaloQrStorageService = ZaloQrStorageService = __decorate([
    (0, common_1.Injectable)()
], ZaloQrStorageService);
//# sourceMappingURL=zalo-qr-storage.service.js.map