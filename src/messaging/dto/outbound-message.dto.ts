import { ChannelType, ThreadType } from '@/shared/types';
import { OutboundAttachment } from '@/channels/channel-adapter.interface';

/**
 * Wire format of jobs in queue `messaging-outbound`.
 * `botId` is carried alongside `botExternalId` so the OutboundProcessor can
 * load Bot row + persist Message without an extra lookup.
 */
export class OutboundMessageDto {
  botId!: number;
  channel!: ChannelType;
  botExternalId!: string;
  threadId!: string;
  threadType!: ThreadType;
  text?: string;
  attachments?: OutboundAttachment[];
  quote?: { messageExternalId: string };
}
