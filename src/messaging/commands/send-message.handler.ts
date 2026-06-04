import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { ChannelType } from '@/shared/types';
import { MessagingPublisher } from '../messaging.publisher';
import { OutboundMessageMapper } from '../outbound-message.mapper';
import { SendMessageValidationService } from '../send-message-validation.service';
import { SendMessageCommand } from './send-message.command';

@CommandHandler(SendMessageCommand)
export class SendMessageHandler implements ICommandHandler<SendMessageCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publisher: MessagingPublisher,
    private readonly validator: SendMessageValidationService,
    private readonly mapper: OutboundMessageMapper,
  ) {}

  async execute(cmd: SendMessageCommand): Promise<{ enqueued: true }> {
    const { input } = cmd;
    const bot = await this.prisma.bot.findFirst({
      where: { externalId: input.botExternalId },
      select: { id: true, externalId: true, channel: true },
    });
    if (!bot) throw new NotFoundException(`Bot ${input.botExternalId} not found`);

    this.validator.validate(input);

    await this.publisher.publishOutbound(
      this.mapper.fromSendCommand(
        { id: bot.id, externalId: bot.externalId, channel: bot.channel as ChannelType },
        input,
      ),
    );
    return { enqueued: true };
  }
}
