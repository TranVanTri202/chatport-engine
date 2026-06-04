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
      threadType: raw.threadType === 'group' ? ThreadType.group : ThreadType.user,
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
