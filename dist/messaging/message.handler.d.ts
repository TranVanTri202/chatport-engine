import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConversationService } from '@/conversations/conversation.service';
import { MessageService } from '@/conversations/message.service';
import { InboundMessageDto } from './dto/inbound-message.dto';
export declare class MessageHandler {
    private readonly conversations;
    private readonly messages;
    private readonly events;
    constructor(conversations: ConversationService, messages: MessageService, events: EventEmitter2);
    handle(msg: InboundMessageDto): Promise<void>;
}
