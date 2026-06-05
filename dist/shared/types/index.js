"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REALTIME_NAMESPACE = exports.RAG_EMBED_QUEUE = exports.MESSAGING_OUTBOUND_QUEUE = exports.MESSAGING_INBOUND_QUEUE = exports.BotStatus = exports.MessageDirection = exports.MessageType = exports.ThreadType = exports.ChannelType = void 0;
var ChannelType;
(function (ChannelType) {
    ChannelType["zalo"] = "zalo";
    ChannelType["telegram"] = "telegram";
    ChannelType["demo"] = "demo";
})(ChannelType || (exports.ChannelType = ChannelType = {}));
var ThreadType;
(function (ThreadType) {
    ThreadType["user"] = "user";
    ThreadType["group"] = "group";
})(ThreadType || (exports.ThreadType = ThreadType = {}));
var MessageType;
(function (MessageType) {
    MessageType["chat"] = "chat";
    MessageType["image"] = "image";
})(MessageType || (exports.MessageType = MessageType = {}));
var MessageDirection;
(function (MessageDirection) {
    MessageDirection["in"] = "in";
    MessageDirection["out"] = "out";
})(MessageDirection || (exports.MessageDirection = MessageDirection = {}));
var BotStatus;
(function (BotStatus) {
    BotStatus["active"] = "active";
    BotStatus["inactive"] = "inactive";
    BotStatus["expired"] = "expired";
})(BotStatus || (exports.BotStatus = BotStatus = {}));
exports.MESSAGING_INBOUND_QUEUE = 'messaging-inbound';
exports.MESSAGING_OUTBOUND_QUEUE = 'messaging-outbound';
exports.RAG_EMBED_QUEUE = 'rag-embed';
exports.REALTIME_NAMESPACE = '/realtime';
//# sourceMappingURL=index.js.map