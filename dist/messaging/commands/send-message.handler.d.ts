import { ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { MessagingPublisher } from '../messaging.publisher';
import { OutboundMessageMapper } from '../outbound-message.mapper';
import { SendMessageValidationService } from '../send-message-validation.service';
import { SendMessageCommand } from './send-message.command';
export declare class SendMessageHandler implements ICommandHandler<SendMessageCommand> {
    private readonly prisma;
    private readonly publisher;
    private readonly validator;
    private readonly mapper;
    constructor(prisma: PrismaService, publisher: MessagingPublisher, validator: SendMessageValidationService, mapper: OutboundMessageMapper);
    execute(cmd: SendMessageCommand): Promise<{
        enqueued: true;
    }>;
}
