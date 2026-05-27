import { Injectable } from '@nestjs/common';
import { ChannelType, ThreadType } from '@/shared/types';
import {
  InboundAttachment,
  InboundMessage,
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
    const { text, attachments } = this.extractContent(raw);

    return {
      channel: ChannelType.zalo,
      botExternalId,
      threadId: String(raw.threadId),
      threadType: raw.threadType === 'group' ? ThreadType.group : ThreadType.user,
      senderExternalId: String(raw.senderId),
      senderName: raw.senderName,
      messageExternalId: String(raw.msgId),
      timestamp: Number(raw.ts ?? Date.now()),
      text,
      attachments,
      quote: raw.quote
        ? { messageExternalId: String(raw.quote.msgId), text: raw.quote.text }
        : undefined,
      mentions: raw.mentions?.map(String),
      isSelf: String(raw.senderId) === botExternalId,
      raw,
    };
  }

  private extractContent(raw: ZaloRawMessage): {
    text?: string;
    attachments: InboundAttachment[];
  } {
    const content = raw.content as unknown;
    if (typeof content === 'string') {
      return { text: content, attachments: [] };
    }

    const c = (content ?? {}) as Record<string, unknown>;
    const msgType = raw.msgType ?? '';
    const href = typeof c.href === 'string' ? c.href : undefined;

    switch (msgType) {
      case 'chat.photo':
        return { attachments: [{ type: 'image', url: href }] };
      case 'chat.video.msg':
        return {
          attachments: [
            {
              type: 'video',
              url: href,
              meta: { duration: c.duration },
            },
          ],
        };
      case 'chat.attach':
        return {
          attachments: [
            {
              type: 'file',
              url: href,
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
              url: href,
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
              url: href,
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
  msgId: string | number;
  msgType?: string;
  threadId: string | number;
  threadType: 'user' | 'group';
  senderId: string | number;
  senderName?: string;
  content: unknown;
  ts?: number;
  quote?: { msgId: string | number; text?: string };
  mentions?: Array<string | number>;
}
