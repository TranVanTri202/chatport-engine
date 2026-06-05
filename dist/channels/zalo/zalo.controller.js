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
exports.ZaloController = void 0;
const common_1 = require("@nestjs/common");
const node_fs_1 = require("node:fs");
const swagger_1 = require("@nestjs/swagger");
const current_customer_decorator_1 = require("../../shared/decorators/current-customer.decorator");
const zalo_qr_storage_service_1 = require("./zalo-qr-storage.service");
const zalo_adapter_1 = require("./zalo.adapter");
let ZaloController = class ZaloController {
    adapter;
    qrStorage;
    constructor(adapter, qrStorage) {
        this.adapter = adapter;
        this.qrStorage = qrStorage;
    }
    async startLogin(customerId) {
        return this.adapter.startLogin({ customerId });
    }
    async getQrBase64() {
        const qrPath = this.qrStorage.getQrPath();
        try {
            const buffer = await node_fs_1.promises.readFile(qrPath);
            const qrBase64 = buffer.toString('base64');
            if (!qrBase64) {
                throw new common_1.NotFoundException(`Zalo QR image is empty at ${qrPath}`);
            }
            return {
                qrBase64: `data:image/png;base64,${qrBase64}`,
                qrPath,
                qrDir: this.qrStorage.getQrDir(),
                rootDir: this.qrStorage.getRootDir(),
            };
        }
        catch (error) {
            throw new common_1.NotFoundException(`Zalo QR image is not ready yet at ${qrPath}: ${error.message}`);
        }
    }
    async status(botId) {
        return { status: await this.adapter.status(botId) };
    }
    async logout(botId) {
        await this.adapter.logout(Number(botId));
        return { ok: true };
    }
};
exports.ZaloController = ZaloController;
__decorate([
    (0, common_1.Post)('login'),
    __param(0, (0, current_customer_decorator_1.CurrentCustomer)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], ZaloController.prototype, "startLogin", null);
__decorate([
    (0, common_1.Get)('qr'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ZaloController.prototype, "getQrBase64", null);
__decorate([
    (0, common_1.Get)('status/:botId'),
    __param(0, (0, common_1.Param)('botId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ZaloController.prototype, "status", null);
__decorate([
    (0, common_1.Post)('logout/:botId'),
    __param(0, (0, common_1.Param)('botId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ZaloController.prototype, "logout", null);
exports.ZaloController = ZaloController = __decorate([
    (0, swagger_1.ApiTags)('channels'),
    (0, swagger_1.ApiBearerAuth)('jwt'),
    (0, common_1.Controller)('channels/zalo'),
    __metadata("design:paramtypes", [zalo_adapter_1.ZaloAdapter,
        zalo_qr_storage_service_1.ZaloQrStorageService])
], ZaloController);
//# sourceMappingURL=zalo.controller.js.map