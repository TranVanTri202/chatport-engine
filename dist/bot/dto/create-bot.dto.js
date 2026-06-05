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
exports.UpdateSystemPromptDto = exports.UpdateTemperatureDto = exports.CreateBotBodyDto = exports.UpdateBotDto = exports.CreateBotDto = exports.BotSettingsDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const types_1 = require("../../shared/types");
class BotSettingsDto {
    llmModel;
    temperature;
    maxTokens;
    topP;
    frequencyPenalty;
    presencePenalty;
    ragTopK;
    extra;
}
exports.BotSettingsDto = BotSettingsDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], BotSettingsDto.prototype, "llmModel", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(2),
    __metadata("design:type", Number)
], BotSettingsDto.prototype, "temperature", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(8192),
    __metadata("design:type", Number)
], BotSettingsDto.prototype, "maxTokens", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(1),
    __metadata("design:type", Number)
], BotSettingsDto.prototype, "topP", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Min)(-2),
    (0, class_validator_1.Max)(2),
    __metadata("design:type", Number)
], BotSettingsDto.prototype, "frequencyPenalty", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Min)(-2),
    (0, class_validator_1.Max)(2),
    __metadata("design:type", Number)
], BotSettingsDto.prototype, "presencePenalty", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(50),
    __metadata("design:type", Number)
], BotSettingsDto.prototype, "ragTopK", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], BotSettingsDto.prototype, "extra", void 0);
class CreateBotDto {
    customerId;
    channel;
    externalId;
    name;
    systemPrompt;
    temperature;
    settings;
}
exports.CreateBotDto = CreateBotDto;
__decorate([
    (0, class_validator_1.IsEnum)(types_1.ChannelType),
    __metadata("design:type", String)
], CreateBotDto.prototype, "channel", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], CreateBotDto.prototype, "externalId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], CreateBotDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(20000),
    __metadata("design:type", String)
], CreateBotDto.prototype, "systemPrompt", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(2),
    __metadata("design:type", Number)
], CreateBotDto.prototype, "temperature", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => BotSettingsDto),
    __metadata("design:type", BotSettingsDto)
], CreateBotDto.prototype, "settings", void 0);
class UpdateBotDto {
    name;
    systemPrompt;
    temperature;
    autoReplyEnabled;
    activeHours;
    fallbackReplies;
    llmModel;
    settings;
}
exports.UpdateBotDto = UpdateBotDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], UpdateBotDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(20000),
    __metadata("design:type", String)
], UpdateBotDto.prototype, "systemPrompt", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(2),
    __metadata("design:type", Number)
], UpdateBotDto.prototype, "temperature", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateBotDto.prototype, "autoReplyEnabled", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], UpdateBotDto.prototype, "activeHours", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], UpdateBotDto.prototype, "fallbackReplies", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], UpdateBotDto.prototype, "llmModel", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => BotSettingsDto),
    __metadata("design:type", BotSettingsDto)
], UpdateBotDto.prototype, "settings", void 0);
class CreateBotBodyDto extends (0, swagger_1.OmitType)(CreateBotDto, [
    'customerId',
]) {
}
exports.CreateBotBodyDto = CreateBotBodyDto;
class UpdateTemperatureDto {
    temperature;
}
exports.UpdateTemperatureDto = UpdateTemperatureDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(2),
    __metadata("design:type", Number)
], UpdateTemperatureDto.prototype, "temperature", void 0);
class UpdateSystemPromptDto {
    systemPrompt;
}
exports.UpdateSystemPromptDto = UpdateSystemPromptDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(20000),
    __metadata("design:type", String)
], UpdateSystemPromptDto.prototype, "systemPrompt", void 0);
//# sourceMappingURL=create-bot.dto.js.map