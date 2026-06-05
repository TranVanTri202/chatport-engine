import { Bot, Conversation } from '@prisma/client';
import { InboundMessageDto } from './dto/inbound-message.dto';
export declare class ReplyPolicyService {
    shouldConsider(input: {
        bot: Bot;
        conversation: Conversation;
        inbound: InboundMessageDto;
    }): boolean;
}
