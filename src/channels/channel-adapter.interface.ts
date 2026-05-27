import { ChannelType, ThreadType } from '@/shared/types';

export interface ChannelCredentialsHint {
  /** Channel-specific payload returned to FE (e.g. QR base64 cho Zalo, deep-link cho Telegram). */
  kind: 'qr' | 'token' | 'link' | 'none';
  data?: unknown;
}

export type AttachmentType =
  | 'image'
  | 'video'
  | 'file'
  | 'voice'
  | 'sticker'
  | 'location'
  | 'link';

export interface InboundAttachment {
  type: AttachmentType;
  url?: string;
  mime?: string;
  size?: number;
  meta?: Record<string, unknown>;
}

export interface InboundMessage {
  channel: ChannelType;
  botExternalId: string;
  threadId: string;
  threadType: ThreadType;
  senderExternalId: string;
  senderName?: string;
  messageExternalId: string;
  timestamp: number;
  text?: string;
  attachments: InboundAttachment[];
  quote?: { messageExternalId: string; text?: string };
  mentions?: string[];
  isSelf?: boolean;
  raw: unknown;
}

export interface OutboundAttachment {
  url: string;
  caption?: string;
}

export interface OutboundMessage {
  threadId: string;
  threadType: ThreadType;
  text?: string;
  attachments?: OutboundAttachment[];
  quote?: { messageExternalId: string };
}

export interface SendResult {
  messageExternalId: string | null;
  sentAt: number;
}

export type ChannelStatus = 'online' | 'offline' | 'expired';

export interface StartLoginInput {
  customerId: number;
}

export interface StartLoginResult {
  sessionId: string;
  hint: ChannelCredentialsHint;
}

export interface IChannelAdapter {
  readonly channel: ChannelType;

  /** Bắt đầu flow đăng nhập. Trả về hint để FE hiển thị (QR / link / token form). */
  startLogin(input: StartLoginInput): Promise<StartLoginResult>;

  /** Khôi phục bot từ session đã lưu (gọi khi NestJS bootstrap). */
  restore(botId: number): Promise<void>;

  /** Đăng xuất, đóng listener, dọn session. */
  logout(botId: number): Promise<void>;

  /** Gửi text/image/file. Adapter tự handle attachment upload riêng của channel. */
  send(botExternalId: string, msg: OutboundMessage): Promise<SendResult>;

  /** Trạng thái runtime của 1 bot. */
  status(botExternalId: string): Promise<ChannelStatus>;
}
