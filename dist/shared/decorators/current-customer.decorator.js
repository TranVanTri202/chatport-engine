"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentCustomer = void 0;
const common_1 = require("@nestjs/common");
exports.CurrentCustomer = (0, common_1.createParamDecorator)((_data, ctx) => {
    const req = ctx.switchToHttp().getRequest();
    const id = req.user?.customerId;
    if (!id)
        throw new common_1.UnauthorizedException('No customer context');
    return id;
});
//# sourceMappingURL=current-customer.decorator.js.map