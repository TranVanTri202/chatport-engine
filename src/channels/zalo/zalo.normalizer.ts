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
    if (attachments.length === 0) return 'chat';
    const type = attachments[0]!.type;
    return type === 'image' || type === 'video' || type === 'file' || type === 'voice' || type === 'sticker' || type === 'link'
      ? type
      : 'unknown';
  }

  private extractContent(input: {
    content: unknown;
    msgType: string;
  }): {
    text?: string;
    attachments: InboundAttachment[];
  } {
    const { content, msgType } = input;
    if (typeof content === 'string') {
      return { text: content, attachments: [] };
    }

    const c = (content ?? {}) as Record<string, unknown>;
    const href = typeof c.href === 'string' ? c.href : undefined;

    switch (msgType) {
      case 'chat.photo':
        return { attachments: [{ type: 'image', url: href ?? '' }] };
      case 'chat.video.msg': {
        let duration: number | undefined = undefined;
        let size: number | undefined = undefined;

        if (typeof c.duration === 'number') {
          duration = c.duration;
        }

        if (typeof c.fileSize === 'number') {
          size = c.fileSize;
        }

        if (typeof c.params === 'string') {
          try {
            const parsed = JSON.parse(c.params);
            if (parsed && typeof parsed === 'object') {
              if (parsed.duration && !duration) {
                duration = Number(parsed.duration);
              }
              if (parsed.fileSize && !size) {
                size = Number(parsed.fileSize);
              }
            }
          } catch (e) {}
        }

        return {
          attachments: [
            {
              type: 'video',
              url: href ?? '',
              size,
              meta: duration ? { duration } : undefined,
            },
          ],
        };
      }
      case 'chat.attach':
      case 'share.file': {
        let size: number | undefined = undefined;
        let mime: string | undefined = undefined;

        if (typeof c.fileSize === 'number') {
          size = c.fileSize;
        } else if (typeof c.fileSize === 'string') {
          size = Number(c.fileSize);
        }

        if (typeof c.fileType === 'string') {
          mime = c.fileType;
        }

        if (typeof c.params === 'string') {
          try {
            const parsed = JSON.parse(c.params);
            if (parsed && typeof parsed === 'object') {
              if (parsed.fileSize && !size) {
                size = Number(parsed.fileSize);
              }
              if (parsed.fileExt && !mime) {
                mime = String(parsed.fileExt);
              }
            }
          } catch (e) {}
        }

        return {
          attachments: [
            {
              type: 'file',
              url: href ?? '',
              name: typeof c.title === 'string' ? c.title : (typeof c.name === 'string' ? c.name : undefined),
              mime,
              size,
            },
          ],
        };
      }
      case 'chat.voice': {
        let size: number | undefined = undefined;
        let duration: number | undefined = undefined;

        if (typeof c.fileSize === 'number') {
          size = c.fileSize;
        } else if (typeof c.fileSize === 'string') {
          size = Number(c.fileSize);
        }

        if (typeof c.duration === 'number') {
          duration = c.duration;
        }

        if (typeof c.params === 'string') {
          try {
            const parsed = JSON.parse(c.params);
            if (parsed && typeof parsed === 'object') {
              if (parsed.fileSize && !size) {
                size = Number(parsed.fileSize);
              }
              if (parsed.duration && !duration) {
                duration = Number(parsed.duration);
              }
            }
          } catch (e) {}
        }

        return {
          attachments: [
            {
              type: 'voice',
              url: href ?? '',
              size,
              meta: duration ? { duration } : undefined,
            },
          ],
        };
      }
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
      case 'chat.recommended': {
        let phone = '';
        let qrCodeUrl = '';
        if (typeof c.description === 'string') {
          try {
            const parsed = JSON.parse(c.description);
            if (parsed && typeof parsed === 'object') {
              phone = parsed.phone || '';
              qrCodeUrl = parsed.qrCodeUrl || '';
            }
          } catch (e) {}
        }

        return {
          attachments: [
            {
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
            },
          ],
        };
      }
      case 'chat.location.new': {
        let lat = '';
        let lng = '';
        if (typeof c.params === 'string') {
          try {
            const parsed = JSON.parse(c.params);
            if (parsed && typeof parsed === 'object') {
              lat = parsed.latitude || '';
              lng = parsed.longitude || '';
            }
          } catch (e) {}
        }
        const mapsUrl = (lat && lng) ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}` : '';

        return {
          attachments: [
            {
              type: 'link',
              url: mapsUrl,
              meta: {
                isLocation: true,
                title: typeof c.title === 'string' && c.title ? c.title : 'Vị trí',
                description: typeof c.description === 'string' ? c.description : '',
                latitude: lat,
                longitude: lng,
              },
            },
          ],
        };
      }
      default:
        return { attachments: [] };
    }
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
