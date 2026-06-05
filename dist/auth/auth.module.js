"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const passport_1 = require("@nestjs/passport");
const app_config_1 = require("../shared/config/app.config");
const prisma_module_1 = require("../shared/prisma/prisma.module");
const auth_controller_1 = require("./auth.controller");
const auth_service_1 = require("./auth.service");
const firebase_auth_service_1 = require("./firebase-auth.service");
const jwt_strategy_1 = require("./jwt.strategy");
const jwt_auth_guard_1 = require("./jwt-auth.guard");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            passport_1.PassportModule.register({ defaultStrategy: 'jwt' }),
            prisma_module_1.PrismaModule,
            jwt_1.JwtModule.registerAsync({
                inject: [app_config_1.AppConfig],
                useFactory: (cfg) => ({
                    secret: cfg.jwtSecret,
                    signOptions: { expiresIn: cfg.jwtExpiresIn },
                }),
            }),
        ],
        controllers: [auth_controller_1.AuthController],
        providers: [auth_service_1.AuthService, firebase_auth_service_1.FirebaseAuthService, jwt_strategy_1.JwtStrategy, jwt_auth_guard_1.JwtAuthGuard],
        exports: [jwt_auth_guard_1.JwtAuthGuard, jwt_1.JwtModule, passport_1.PassportModule],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map