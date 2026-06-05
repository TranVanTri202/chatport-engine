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
exports.UploadDocumentMetaBodyDto = exports.ImportUrlBodyDto = exports.UploadDocumentMetaDto = exports.ImportUrlDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class ImportUrlDto {
    channel;
    externalId;
    url;
    title;
}
exports.ImportUrlDto = ImportUrlDto;
__decorate([
    (0, class_validator_1.IsUrl)({ protocols: ['http', 'https'], require_protocol: true }),
    __metadata("design:type", String)
], ImportUrlDto.prototype, "url", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], ImportUrlDto.prototype, "title", void 0);
class UploadDocumentMetaDto {
    channel;
    externalId;
    title;
}
exports.UploadDocumentMetaDto = UploadDocumentMetaDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], UploadDocumentMetaDto.prototype, "title", void 0);
class ImportUrlBodyDto extends (0, swagger_1.OmitType)(ImportUrlDto, [
    'channel',
    'externalId',
]) {
}
exports.ImportUrlBodyDto = ImportUrlBodyDto;
class UploadDocumentMetaBodyDto extends (0, swagger_1.OmitType)(UploadDocumentMetaDto, [
    'channel',
    'externalId',
]) {
}
exports.UploadDocumentMetaBodyDto = UploadDocumentMetaBodyDto;
//# sourceMappingURL=import-url.dto.js.map