"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplyPolicyService = void 0;
const common_1 = require("@nestjs/common");
const types_1 = require("../shared/types");
let ReplyPolicyService = class ReplyPolicyService {
    shouldConsider(input) {
        const { inbound, conversation, bot } = input;
        if (inbound.isSelf)
            return false;
        if (inbound.type !== 'chat')
            return false;
        const text = inbound.text?.trim();
        if (!text)
            return false;
        if (conversation.threadType === types_1.ThreadType.group) {
            const meta = conversation.metadata ?? {};
            if (meta.alwaysReply === true)
                return true;
            return (inbound.mentions ?? []).includes(bot.externalId);
        }
        return true;
    }
};
exports.ReplyPolicyService = ReplyPolicyService;
exports.ReplyPolicyService = ReplyPolicyService = __decorate([
    (0, common_1.Injectable)()
], ReplyPolicyService);
//# sourceMappingURL=reply-policy.service.js.map