"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZaloNormalizer = void 0;
const common_1 = require("@nestjs/common");
const types_1 = require("../../shared/types");
let ZaloNormalizer = class ZaloNormalizer {
    normalizeMessage(input) {
        const { botExternalId, raw } = input;
        const payload = (raw.data ?? raw);
        const content = payload.content ?? raw.content;
        const msgType = payload.msgType ?? raw.msgType ?? '';
        const { text, attachments } = this.extractContent({ content, msgType });
        const senderExternalId = String(payload.uidFrom ?? raw.senderId ?? '');
        const threadId = String(raw.threadId ?? payload.uidFrom ?? payload.idTo ?? senderExternalId);
        const quote = payload.quote ?? raw.quote;
        const mentions = payload.mentions ?? raw.mentions;
        return {
            channel: types_1.ChannelType.zalo,
            botExternalId,
            threadId,
            threadType: (raw.threadType === 'group' || String(raw.threadType) === '1' || raw.type === 1) ? types_1.ThreadType.group : types_1.ThreadType.user,
            senderExternalId,
            senderName: payload.dName ?? raw.senderName,
            messageExternalId: String(payload.msgId ?? raw.msgId ?? ''),
            timestamp: Number(payload.ts ?? raw.ts ?? Date.now()),
            type: this.resolveMessageType(attachments),
            text,
            attachments,
            quote: quote
                ? { messageExternalId: String(quote.msgId), text: quote.text }
                : undefined,
            mentions: mentions?.map(String),
            isSelf: senderExternalId === botExternalId,
            raw,
        };
    }
    resolveMessageType(attachments) {
        if (attachments.length === 0)
            return 'chat';
        const type = attachments[0].type;
        return type === 'image' || type === 'video' || type === 'file' || type === 'voice' || type === 'sticker' || type === 'link'
            ? type
            : 'unknown';
    }
    extractContent(input) {
        const { content, msgType } = input;
        if (typeof content === 'string') {
            return { text: content, attachments: [] };
        }
        const c = (content ?? {});
        const href = typeof c.href === 'string' ? c.href : undefined;
        switch (msgType) {
            case 'chat.photo':
                return { attachments: [{ type: 'image', url: href ?? '' }] };
            case 'chat.video.msg':
                return {
                    attachments: [
                        {
                            type: 'video',
                            url: href ?? '',
                            meta: { duration: c.duration },
                        },
                    ],
                };
            case 'chat.attach':
                return {
                    attachments: [
                        {
                            type: 'file',
                            url: href ?? '',
                            mime: typeof c.fileType === 'string' ? c.fileType : undefined,
                            size: typeof c.fileSize === 'number' ? c.fileSize : undefined,
                        },
                    ],
                };
            case 'chat.voice':
                return {
                    attachments: [
                        {
                            type: 'voice',
                            url: href ?? '',
                            size: typeof c.fileSize === 'number' ? c.fileSize : undefined,
                        },
                    ],
                };
            case 'chat.sticker':
                return { attachments: [{ type: 'sticker', meta: c }] };
            case 'chat.link':
                return {
                    attachments: [
                        {
                            type: 'link',
                            url: href ?? '',
                            meta: {
                                title: c.title,
                                thumb: c.thumb,
                                description: c.description,
                            },
                        },
                    ],
                };
            default:
                return { attachments: [] };
        }
    }
};
exports.ZaloNormalizer = ZaloNormalizer;
exports.ZaloNormalizer = ZaloNormalizer = __decorate([
    (0, common_1.Injectable)()
], ZaloNormalizer);
//# sourceMappingURL=zalo.normalizer.js.map