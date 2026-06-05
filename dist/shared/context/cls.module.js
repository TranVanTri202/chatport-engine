"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppClsModule = void 0;
const common_1 = require("@nestjs/common");
const nestjs_cls_1 = require("nestjs-cls");
const node_crypto_1 = require("node:crypto");
const request_context_1 = require("./request-context");
let AppClsModule = class AppClsModule {
};
exports.AppClsModule = AppClsModule;
exports.AppClsModule = AppClsModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [
            nestjs_cls_1.ClsModule.forRoot({
                global: true,
                middleware: {
                    mount: true,
                    generateId: true,
                    idGenerator: (req) => {
                        const h = req.headers['x-request-id'];
                        return (Array.isArray(h) ? h[0] : h) ?? (0, node_crypto_1.randomUUID)();
                    },
                    setup: (cls, req) => {
                        cls.set(request_context_1.CTX.RequestId, req.id ?? cls.getId());
                    },
                },
            }),
        ],
        exports: [nestjs_cls_1.ClsModule],
    })
], AppClsModule);
//# sourceMappingURL=cls.module.js.map