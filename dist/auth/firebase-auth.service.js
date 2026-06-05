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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirebaseAuthService = void 0;
const common_1 = require("@nestjs/common");
const admin = __importStar(require("firebase-admin"));
const app_config_1 = require("../shared/config/app.config");
let FirebaseAuthService = class FirebaseAuthService {
    config;
    app;
    constructor(config) {
        this.config = config;
        this.app = admin.apps.length ? admin.app() : this.initializeApp();
    }
    initializeApp() {
        const serviceAccountJson = this.config.firebaseServiceAccountJson;
        if (serviceAccountJson) {
            try {
                const serviceAccount = JSON.parse(serviceAccountJson);
                return admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
            }
            catch {
                throw new common_1.InternalServerErrorException('Invalid FIREBASE_SERVICE_ACCOUNT_JSON');
            }
        }
        const clientEmail = this.config.firebaseClientEmail;
        const privateKey = this.config.firebasePrivateKey?.replace(/\\n/g, '\n');
        if (clientEmail && privateKey) {
            return admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: this.config.firebaseProjectId,
                    clientEmail,
                    privateKey,
                }),
            });
        }
        return admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: this.config.firebaseProjectId,
        });
    }
    async verifyIdToken(idToken, provider) {
        try {
            const decoded = await this.app.auth().verifyIdToken(idToken);
            const metadata = await this.app.auth().getUser(decoded.uid);
            return {
                email: decoded.email ?? metadata.email ?? '',
                name: decoded.name ?? metadata.displayName ?? 'User',
                picture: decoded.picture ?? metadata.photoURL ?? undefined,
                firebaseUid: decoded.uid,
                provider,
            };
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid Firebase idToken');
        }
    }
};
exports.FirebaseAuthService = FirebaseAuthService;
exports.FirebaseAuthService = FirebaseAuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [app_config_1.AppConfig])
], FirebaseAuthService);
//# sourceMappingURL=firebase-auth.service.js.map