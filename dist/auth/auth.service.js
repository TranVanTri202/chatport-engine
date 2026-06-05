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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../shared/prisma/prisma.service");
const app_config_1 = require("../shared/config/app.config");
const DEMO_CUSTOMER_EMAIL = 'demo@askbase.local';
const DEMO_CUSTOMER_NAME = 'Demo Customer';
let AuthService = class AuthService {
    prisma;
    jwt;
    config;
    constructor(prisma, jwt, config) {
        this.prisma = prisma;
        this.jwt = jwt;
        this.config = config;
    }
    async generateRefreshToken(customerId) {
        const token = (0, node_crypto_1.randomBytes)(64).toString('hex');
        const expiresAt = new Date(Date.now() + this.config.jwtRefreshExpiresInDays * 24 * 60 * 60 * 1000);
        await this.prisma.refreshToken.create({
            data: {
                token,
                customerId,
                expiresAt,
            },
        });
        return token;
    }
    async loginWithFirebase(profile) {
        const customer = await this.prisma.customer.upsert({
            where: { email: profile.email },
            update: {
                name: profile.name,
                picture: profile.picture,
                firebaseUid: profile.firebaseUid,
            },
            create: {
                email: profile.email,
                name: profile.name,
                picture: profile.picture,
                firebaseUid: profile.firebaseUid,
            },
        });
        const token = await this.jwt.signAsync({
            sub: customer.id,
            customerId: customer.id,
            email: profile.email,
            provider: profile.provider,
            firebaseUid: profile.firebaseUid,
        });
        const refreshToken = await this.generateRefreshToken(customer.id);
        return {
            accessToken: token,
            refreshToken,
            customer: {
                id: customer.id,
                name: customer.name,
                email: customer.email,
                picture: customer.picture,
                firebaseUid: customer.firebaseUid,
                provider: profile.provider,
            },
        };
    }
    async login(email) {
        const defaultName = email.split('@')[0] || 'User';
        const customer = await this.prisma.customer.upsert({
            where: { email },
            update: {
                name: defaultName,
            },
            create: {
                email,
                name: defaultName,
            },
        });
        const accessToken = await this.jwt.signAsync({
            sub: customer.id,
            customerId: customer.id,
            email: customer.email,
        });
        const refreshToken = await this.generateRefreshToken(customer.id);
        return {
            accessToken,
            access_token: accessToken,
            refreshToken,
            customer,
        };
    }
    async refresh(token) {
        const record = await this.prisma.refreshToken.findUnique({
            where: { token },
            include: { customer: true },
        });
        if (!record || record.expiresAt < new Date()) {
            if (record) {
                await this.prisma.refreshToken.delete({ where: { id: record.id } }).catch(() => undefined);
            }
            throw new common_1.UnauthorizedException('Invalid or expired refresh token');
        }
        const accessToken = await this.jwt.signAsync({
            sub: record.customerId,
            customerId: record.customerId,
            email: record.customer.email,
        });
        const newRefreshToken = await this.generateRefreshToken(record.customerId);
        await this.prisma.refreshToken.delete({
            where: { id: record.id },
        }).catch(() => undefined);
        return {
            accessToken,
            refreshToken: newRefreshToken,
        };
    }
    async logout(token) {
        await this.prisma.refreshToken.deleteMany({
            where: { token },
        });
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        app_config_1.AppConfig])
], AuthService);
//# sourceMappingURL=auth.service.js.map