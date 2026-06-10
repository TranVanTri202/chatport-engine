import { Injectable } from '@nestjs/common';
import { ChannelType, ThreadType } from '@/shared/types';
import {
  InboundAttachment,
  InboundMessage,
  MessageType,
} from '../channel-adapter.interface';

/**
 * Normalize raw zca-js events → channel-agnostic InboundMessage.
 *
 * Mapping table (per plan §8.3):
 *
 *  Zalo                               | InboundMessage
 *  -----------------------------------+--------------------------------------------------
 *  typeof content === 'string'        | text = content, attachments = []
 *  msgType === 'chat.photo'           | attachments=[{ type:'image', url: content.href }]
 *  msgType === 'chat.video.msg'       | attachments=[{ type:'video', url, meta:{duration} }]
 *  msgType === 'chat.attach'          | attachments=[{ type:'file', url, mime, size }]
 *  msgType === 'chat.voice'           | attachments=[{ type:'voice', url, size }]
 *  msgType === 'chat.sticker'         | attachments=[{ type:'sticker', meta }]
 *  msgType === 'chat.link'            | attachments=[{ type:'link', url, meta }]
 *
 * Adapter-private. Pure function — no IO. Easy to unit test.
 */
@Injectable()
export class ZaloNormalizer {
  normalizeMessage(input: {
    botExternalId: string;
    raw: ZaloRawMessage;
  }): InboundMessage {
    const { botExternalId, raw } = input;
    const payload = (raw.data ?? raw) as Partial<ZaloRawMessage['data']> &
      Pick<
        ZaloRawMessage,
        'msgId' | 'msgType' | 'threadId' | 'threadType' | 'senderId' | 'senderName' | 'content' | 'ts' | 'quote' | 'mentions'
      >;
    const content = payload.content ?? raw.content;
    const msgType = payload.msgType ?? raw.msgType ?? '';
    const { text, attachments } = this.extractContent({ content, msgType });
    const senderExternalId = String(payload.uidFrom ?? raw.senderId ?? '');
    const threadId = String(raw.threadId ?? payload.uidFrom ?? payload.idTo ?? senderExternalId);
    const quote = payload.quote ?? raw.quote;
    const mentions = payload.mentions ?? raw.mentions;

    return {
      channel: ChannelType.zalo,
      botExternalId,
      threadId,
      threadType: (raw.threadType === 'group' || String(raw.threadType) === '1' || (raw as any).type === 1) ? ThreadType.group : ThreadType.user,
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

  private resolveMessageType(attachments: InboundAttachment[]): MessageType {
    if (attachments.length === 0) return 'webchat';
    const type = attachments[0]!.type;
    return type === 'image' || type === 'video' || type === 'file' || type === 'voice' || type === 'sticker' || type === 'link'
      ? type
      : 'unknown';
  }

  // ── Content extraction ──────────────────────────────────────────

  /**
   * Return the first numeric value found, preferring the raw field over
   * the parsed-params fallback. Handles both `number` and numeric `string`.
   */
  private numOrUndef(
    raw: unknown,
    fromParams: unknown,
  ): number | undefined {
    if (typeof raw === 'number') return raw;
    if (typeof raw === 'string') { const n = Number(raw); if (!isNaN(n)) return n; }
    if (typeof fromParams === 'number') return fromParams;
    if (typeof fromParams === 'string') { const n = Number(fromParams); if (!isNaN(n)) return n; }
    return undefined;
  }

  private extractContent(input: {
    content: unknown;
    msgType: string;
  }): { text?: string; attachments: InboundAttachment[] } {
    const { content, msgType } = input;

    if (typeof content === 'string') {
      return { text: content, attachments: [] };
    }

    const c = (content ?? {}) as Record<string, unknown>;
    const href = typeof c.href === 'string' ? c.href : undefined;

    switch (msgType) {
      case 'chat.photo':
        return { attachments: [{ type: 'image', url: href ?? '' }] };
      case 'chat.video.msg':
        return { attachments: [this.extractVideo(c, href)] };
      case 'chat.attach':
      case 'share.file':
        return { attachments: [this.extractFile(c, href)] };
      case 'chat.voice':
        return { attachments: [this.extractVoice(c, href)] };
      case 'chat.sticker': {
        const stickerId = c.id ?? c.stickerId ?? null;
        const ZALO_STICKER_BASE_URL = 'https://zalo-api.zadn.vn';
        const stickerUrl = (typeof c.stickerUrl === 'string' ? c.stickerUrl : undefined)
          ?? (typeof c.href === 'string' ? c.href : undefined)
          ?? (typeof c.thumb === 'string' ? c.thumb : undefined)
          ?? (stickerId ? `${ZALO_STICKER_BASE_URL}/api/emoticon/sticker/webpc?eid=${stickerId}&size=130` : '');
        const spriteUrl = (typeof c.stickerSpriteUrl === 'string' ? c.stickerSpriteUrl : undefined)
          ?? (stickerId ? `${ZALO_STICKER_BASE_URL}/api/emoticon/sprite?eid=${stickerId}&size=130` : '');

        return {
          attachments: [
            {
              type: 'sticker',
              url: stickerUrl,
              meta: {
                sticker_id: stickerId ? Number(stickerId) : undefined,
                cat_id: c.catId ?? c.cateId ?? c.cate_id,
                sticker_type: c.type ?? c.stickerType,
                url: stickerUrl,
                sprite_url: spriteUrl,
                frames: c.totalFrames ?? null,
              },
            },
          ],
        };
      }
      case 'chat.link':
        return {
          attachments: [{
            type: 'link', url: href ?? '',
            meta: { title: c.title, thumb: c.thumb, description: c.description },
          }],
        };
      case 'chat.recommended':
        return { attachments: [this.extractRecommended(c, href)] };
      case 'chat.location.new':
        return { attachments: [this.extractLocation(c)] };
      default:
        return { attachments: [] };
    }
  }

  /** Parse c.params as JSON once and reuse across extractors. */
  private parseParams(c: Record<string, unknown>): Record<string, unknown> {
    if (typeof c.params !== 'string') return {};
    try {
      const parsed = JSON.parse(c.params);
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }

  private extractVideo(
    c: Record<string, unknown>,
    href: string | undefined,
  ): InboundAttachment {
    const p = this.parseParams(c);
    return {
      type: 'video',
      url: href ?? '',
      size: this.numOrUndef(c.fileSize, p.fileSize),
      meta: (this.numOrUndef(c.duration, p.duration) !== undefined
        ? { duration: this.numOrUndef(c.duration, p.duration) }
        : undefined),
    };
  }

  private extractFile(
    c: Record<string, unknown>,
    href: string | undefined,
  ): InboundAttachment {
    const p = this.parseParams(c);
    return {
      type: 'file',
      url: href ?? '',
      name: typeof c.title === 'string' ? c.title
        : typeof c.name === 'string' ? c.name
        : undefined,
      mime: (typeof c.fileType === 'string' ? c.fileType : undefined)
        ?? (typeof p.fileExt === 'string' ? p.fileExt as string : undefined),
      size: this.numOrUndef(c.fileSize, p.fileSize),
    };
  }

  private extractVoice(
    c: Record<string, unknown>,
    href: string | undefined,
  ): InboundAttachment {
    const p = this.parseParams(c);
    return {
      type: 'voice',
      url: href ?? '',
      size: this.numOrUndef(c.fileSize, p.fileSize),
      meta: (this.numOrUndef(c.duration, p.duration) !== undefined
        ? { duration: this.numOrUndef(c.duration, p.duration) }
        : undefined),
    };
  }

  private extractRecommended(
    c: Record<string, unknown>,
    href: string | undefined,
  ): InboundAttachment {
    let phone = '';
    let qrCodeUrl = '';
    if (typeof c.description === 'string') {
      try {
        const parsed = JSON.parse(c.description);
        if (parsed && typeof parsed === 'object') {
          phone = (parsed as Record<string, string>).phone || '';
          qrCodeUrl = (parsed as Record<string, string>).qrCodeUrl || '';
        }
      } catch { /* ignore */ }
    }
    return {
      type: 'link',
      url: href ?? '',
      meta: {
        isCard: true,
        title: typeof c.title === 'string' ? c.title : '',
        thumb: typeof c.thumb === 'string' ? c.thumb : '',
        userId: typeof c.params === 'string' ? c.params : '',
        phone,
        qrCodeUrl,
      },
    };
  }

  private extractLocation(c: Record<string, unknown>): InboundAttachment {
    const p = this.parseParams(c);
    const lat = String(p.latitude ?? '');
    const lng = String(p.longitude ?? '');
    const mapsUrl = (lat && lng)
      ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
      : '';
    return {
      type: 'link',
      url: mapsUrl,
      meta: {
        isLocation: true,
        title: typeof c.title === 'string' && c.title ? c.title : 'Vị trí',
        description: typeof c.description === 'string' ? c.description : '',
        latitude: lat,
        longitude: lng,
      },
    };
  }
}

/** Loose shape of an inbound zca-js message — kept local to the adapter. */
export interface ZaloRawMessage {
  msgId?: string | number;
  msgType?: string;
  threadId?: string | number;
  threadType?: 'user' | 'group';
  senderId?: string | number;
  senderName?: string;
  content?: unknown;
  ts?: number;
  quote?: { msgId: string | number; text?: string };
  mentions?: Array<string | number>;
  data?: {
    actionId?: string;
    msgId?: string | number;
    cliMsgId?: string;
    msgType?: string;
    uidFrom?: string | number;
    idTo?: string | number;
    dName?: string;
    ts?: string | number;
    content?: unknown;
    quote?: { msgId: string | number; text?: string };
    mentions?: Array<string | number>;
  };
}
