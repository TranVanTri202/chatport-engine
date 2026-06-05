"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStorageDir = getStorageDir;
exports.ensureWritableStorageDir = ensureWritableStorageDir;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const DEFAULT_STORAGE_ROOT = process.env.STORAGE_ROOT ?? (0, node_path_1.join)(process.cwd(), 'storage');
function getStorageDir(...segments) {
    return (0, node_path_1.join)(DEFAULT_STORAGE_ROOT, ...segments);
}
function ensureWritableStorageDir(...segments) {
    const dir = getStorageDir(...segments);
    (0, node_fs_1.mkdirSync)(dir, { recursive: true });
    return dir;
}
//# sourceMappingURL=storage-path.util.js.map