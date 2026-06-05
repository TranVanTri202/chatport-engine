import { OutboundMessageDto } from './dto/outbound-message.dto';
import { SendMessageCommand } from './commands/send-message.command';
export declare class OutboundMessageMapper {
    fromSendCommand(bot: {
        id: number;
        externalId: string;
        channel: string;
    }, input: SendMessageCommand['input']): OutboundMessageDto;
}
