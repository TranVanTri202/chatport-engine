import { ChannelType, ThreadType } from '@/shared/types';
import { InboundAttachment } from '@/channels/channel-adapter.interface';

/**
 * Wire format of jobs in queue `messaging-inbound`. Equivalent to the
 * adapter-facing InboundMessage interface but kept as its own DTO so we can
 * evolve them independently (e.g. drop `raw` before persisting).
 */
export class InboundMessageDto {
  channel!: ChannelType;
  botExternalId!: string;
  threadId!: string;
  threadType!: ThreadType;
  senderExternalId!: string;
  senderName?: string;
  messageExternalId!: string;
  timestamp!: number;
  type!: 'chat' | 'image' | 'video' | 'file' | 'voice' | 'sticker' | 'link' | 'unknown' | 'pin';
  text?: string;
  attachments!: InboundAttachment[];
  quote?: { messageExternalId: string; text?: string };
  mentions?: string[];
  isSelf?: boolean;
  raw?: unknown;
}
