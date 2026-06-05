"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.installBigIntJsonSerializer = installBigIntJsonSerializer;
function installBigIntJsonSerializer() {
    BigInt.prototype.toJSON = function toJSON() {
        return this.toString();
    };
}
//# sourceMappingURL=bigint-serializer.js.map