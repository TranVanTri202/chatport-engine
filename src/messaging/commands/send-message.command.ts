import { ICommand } from '@nestjs/cqrs';
import { ThreadType } from '@/shared/types';
import { OutboundAttachment } from '@/channels/channel-adapter.interface';

/**
 * Send-a-message intent. Dispatched by either:
 *  - `MessagesController` for explicit manual sends, or
 *  - `BotResponseService` for auto-replies (after LLM returns).
 *
 * Demonstrates the CQRS seam: callers express WHAT they want, the handler
 * decides HOW (today = enqueue BullMQ; tomorrow could be direct-send for
 * priority messages, or branch to a different transport).
 */
export class SendMessageCommand implements ICommand {
  constructor(
    public readonly input: {
      botId: number;
      threadId: string;
      threadType: ThreadType;
      text?: string;
      attachments?: OutboundAttachment[];
      quote?: { messageExternalId: string };
    },
  ) {}
}
