export declare enum ChannelType {
    zalo = "zalo",
    telegram = "telegram",
    demo = "demo"
}
export declare enum ThreadType {
    user = "user",
    group = "group"
}
export declare enum MessageType {
    chat = "chat",
    image = "image"
}
export declare enum MessageDirection {
    in = "in",
    out = "out"
}
export declare enum BotStatus {
    active = "active",
    inactive = "inactive",
    expired = "expired"
}
export declare const MESSAGING_INBOUND_QUEUE = "messaging-inbound";
export declare const MESSAGING_OUTBOUND_QUEUE = "messaging-outbound";
export declare const RAG_EMBED_QUEUE = "rag-embed";
export declare const REALTIME_NAMESPACE = "/realtime";
