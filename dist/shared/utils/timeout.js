"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.timeout = timeout;
exports.sha1Hex = sha1Hex;
function timeout(ms, message = 'timeout') {
    return new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms));
}
function sha1Hex(input) {
    const { createHash } = require('node:crypto');
    return createHash('sha1').update(input).digest('hex');
}
//# sourceMappingURL=timeout.js.map