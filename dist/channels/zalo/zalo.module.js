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
var ZaloModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZaloModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/prisma/prisma.service");
const messaging_module_1 = require("../../messaging/messaging.module");
const zalo_adapter_1 = require("./zalo.adapter");
const zalo_controller_1 = require("./zalo.controller");
const zalo_instance_registry_1 = require("./zalo-instance.registry");
const zalo_session_service_1 = require("./zalo-session.service");
const zalo_normalizer_1 = require("./zalo.normalizer");
const zalo_listeners_1 = require("./zalo.listeners");
const zalo_qr_storage_service_1 = require("./zalo-qr-storage.service");
const zalo_zca_service_1 = require("./zalo-zca.service");
let ZaloModule = ZaloModule_1 = class ZaloModule {
    prisma;
    adapter;
    logger = new common_1.Logger(ZaloModule_1.name);
    constructor(prisma, adapter) {
        this.prisma = prisma;
        this.adapter = adapter;
    }
    async onApplicationBootstrap() {
        const bots = await this.prisma.bot.findMany({
            where: { channel: 'zalo', status: { in: ['active', 'expired'] } },
        });
        for (const bot of bots) {
            try {
                await this.adapter.restore(bot.id);
            }
            catch (err) {
                this.logger.error(`restore failed for bot ${bot.id}: ${err.message}`);
            }
        }
    }
};
exports.ZaloModule = ZaloModule;
exports.ZaloModule = ZaloModule = ZaloModule_1 = __decorate([
    (0, common_1.Module)({
        imports: [(0, common_1.forwardRef)(() => messaging_module_1.MessagingModule)],
        controllers: [zalo_controller_1.ZaloController],
        providers: [
            zalo_adapter_1.ZaloAdapter,
            zalo_instance_registry_1.ZaloInstanceRegistry,
            zalo_session_service_1.ZaloSessionService,
            zalo_normalizer_1.ZaloNormalizer,
            zalo_listeners_1.ZaloListeners,
            zalo_qr_storage_service_1.ZaloQrStorageService,
            zalo_zca_service_1.ZaloZcaService,
        ],
        exports: [zalo_adapter_1.ZaloAdapter, zalo_zca_service_1.ZaloZcaService, zalo_normalizer_1.ZaloNormalizer],
    }),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        zalo_adapter_1.ZaloAdapter])
], ZaloModule);
//# sourceMappingURL=zalo.module.js.map