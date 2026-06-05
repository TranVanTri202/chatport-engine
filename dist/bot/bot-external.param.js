"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotExternal = void 0;
const common_1 = require("@nestjs/common");
exports.BotExternal = (0, common_1.createParamDecorator)((_data, ctx) => {
    const req = ctx.switchToHttp().getRequest();
    const channel = req.params.channel;
    const externalId = req.params.externalId;
    if (!channel || !externalId) {
        throw new common_1.BadRequestException('channel and externalId are required');
    }
    return { channel, externalId };
});
//# sourceMappingURL=bot-external.param.js.map