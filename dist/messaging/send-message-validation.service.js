"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SendMessageValidationService = void 0;
const common_1 = require("@nestjs/common");
const types_1 = require("../shared/types");
let SendMessageValidationService = class SendMessageValidationService {
    validate(input) {
        if (input.type !== types_1.MessageType.chat && input.type !== types_1.MessageType.image) {
            throw new common_1.BadRequestException('Currently only chat and image messages are supported');
        }
        if (input.type === types_1.MessageType.chat) {
            this.validateChat(input.text, input.attachments?.length ?? 0);
            return;
        }
        if (input.type === types_1.MessageType.image) {
            this.validateImage(input.attachments?.length ?? 0);
        }
    }
    validateChat(text, attachmentCount) {
        if (!text?.trim()) {
            throw new common_1.BadRequestException('Text is required for chat messages');
        }
        if (attachmentCount > 0) {
            throw new common_1.BadRequestException('Attachments are not supported for chat messages');
        }
    }
    validateImage(attachmentCount) {
        if (attachmentCount < 1) {
            throw new common_1.BadRequestException('At least one image attachment is required for image messages');
        }
        if (attachmentCount > 10) {
            throw new common_1.BadRequestException('A maximum of 10 image attachments is allowed');
        }
    }
};
exports.SendMessageValidationService = SendMessageValidationService;
exports.SendMessageValidationService = SendMessageValidationService = __decorate([
    (0, common_1.Injectable)()
], SendMessageValidationService);
//# sourceMappingURL=send-message-validation.service.js.map