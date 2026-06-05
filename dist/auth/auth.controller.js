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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const public_decorator_1 = require("./public.decorator");
const auth_service_1 = require("./auth.service");
const firebase_auth_service_1 = require("./firebase-auth.service");
class FirebaseLoginDto {
    provider;
    idToken;
}
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'google', enum: ['google', 'facebook'] }),
    (0, class_validator_1.IsIn)(['google', 'facebook']),
    __metadata("design:type", String)
], FirebaseLoginDto.prototype, "provider", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'eyJhbGciOiJSUzI1NiIs...' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], FirebaseLoginDto.prototype, "idToken", void 0);
class RefreshTokenDto {
    refreshToken;
}
__decorate([
    (0, swagger_1.ApiProperty)({ example: '3213ab1c...' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], RefreshTokenDto.prototype, "refreshToken", void 0);
class LocalLoginDto {
    email;
}
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'ban@congty.vn' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], LocalLoginDto.prototype, "email", void 0);
let AuthController = class AuthController {
    firebaseAuth;
    authService;
    constructor(firebaseAuth, authService) {
        this.firebaseAuth = firebaseAuth;
        this.authService = authService;
    }
    async socialLogin(body) {
        const profile = await this.firebaseAuth.verifyIdToken(body.idToken, body.provider);
        return this.authService.loginWithFirebase(profile);
    }
    async login(body) {
        return this.authService.login(body.email);
    }
    async refresh(body) {
        return this.authService.refresh(body.refreshToken);
    }
    async logout(body) {
        await this.authService.logout(body.refreshToken);
        return { ok: true };
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('social-login'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [FirebaseLoginDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "socialLogin", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [LocalLoginDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('refresh'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [RefreshTokenDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('logout'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [RefreshTokenDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)('auth'),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [firebase_auth_service_1.FirebaseAuthService,
        auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map