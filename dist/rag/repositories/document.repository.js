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
exports.DocumentRepository = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/prisma/prisma.service");
let DocumentRepository = class DocumentRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    findManyByBot(botId) {
        return this.prisma.document.findMany({
            where: { botId },
            orderBy: { id: 'desc' },
        });
    }
    findById(id) {
        return this.prisma.document.findUnique({ where: { id } });
    }
    create(data) {
        return this.prisma.document.create({ data });
    }
    update(id, data) {
        return this.prisma.document.update({ where: { id }, data });
    }
    delete(id) {
        return this.prisma.document.delete({ where: { id } });
    }
};
exports.DocumentRepository = DocumentRepository;
exports.DocumentRepository = DocumentRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DocumentRepository);
//# sourceMappingURL=document.repository.js.map