import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { QuotaService } from '@/quota/quota.service';
import { MessagingPublisher } from '../messaging.publisher';
import { SendMessageCommand } from './send-message.command';

@CommandHandler(SendMessageCommand)
export class SendMessageHandler implements ICommandHandler<SendMessageCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publisher: MessagingPublisher,
    private readonly quota: QuotaService,
  ) {}

  async execute(cmd: SendMessageCommand): Promise<{ enqueued: true }> {
    const { input } = cmd;
    const bot = await this.prisma.bot.findUnique({
      where: { id: input.botId },
      select: { id: true, externalId: true, channel: true },
    });
    if (!bot) throw new NotFoundException(`Bot ${input.botId} not found`);

    // Manual sends count toward the trial cap too. Throws → bubbles up as
    // 402 Payment Required via GlobalExceptionFilter.
    await this.quota.consumeRequest(bot.id);

    await this.publisher.publishOutbound({
      botId: bot.id,
      channel: bot.channel as unknown as import('@/shared/types').ChannelType,
      botExternalId: bot.externalId,
      threadId: input.threadId,
      threadType: input.threadType,
      text: input.text,
      attachments: input.attachments,
      quote: input.quote,
    });
    return { enqueued: true };
  }
}
