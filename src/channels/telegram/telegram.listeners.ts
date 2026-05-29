import { Injectable, Logger } from '@nestjs/common';
import { MessagingPublisher } from '@/messaging/messaging.publisher';
import { ChannelType, ThreadType } from '@/shared/types';
import { InboundMessage } from '../channel-adapter.interface';

@Injectable()
export class TelegramListeners {
  private readonly logger = new Logger(TelegramListeners.name);

  constructor(private readonly publisher: MessagingPublisher) {}

  attach(bot: any, botExternalId: string): void {
    bot.on('message', async (ctx: any) => {
      try {
        const normalized = this.normalizeMessage(botExternalId, ctx.message, ctx);
        await this.publisher.publishInbound(normalized);
      } catch (error) {
        this.logger.error(
          `Failed to handle Telegram message for bot=${botExternalId}: ${(error as Error).message}`,
        );
      }
    });
  }

  private normalizeMessage(botExternalId: string, message: any, ctx: any): InboundMessage {
    const from = message.from ?? {};
    const chat = message.chat ?? {};
    const text = message.text ?? message.caption;
    const threadId = String(chat.id ?? from.id ?? '');

    return {
      channel: ChannelType.telegram,
      botExternalId,
      threadId,
      threadType: chat.type === 'group' || chat.type === 'supergroup' ? ThreadType.group : ThreadType.user,
      senderExternalId: String(from.id ?? threadId),
      senderName: [from.first_name, from.last_name].filter(Boolean).join(' ') || from.username,
      messageExternalId: String(message.message_id ?? `${Date.now()}`),
      timestamp: Number(message.date ? message.date * 1000 : Date.now()),
      text: typeof text === 'string' ? text : undefined,
      attachments: [],
      raw: { message, update: ctx.update },
    };
  }
}
