import { BotStatusChangedEvent, DocumentStatusChangedEvent, MessageReactedEvent, MessageReceivedEvent, MessageSentEvent } from '@/shared/events/domain-events';
import { RealtimeGateway } from './realtime.gateway';
export declare class RealtimeListener {
    private readonly gateway;
    constructor(gateway: RealtimeGateway);
    onReceived(e: MessageReceivedEvent): void;
    onSent(e: MessageSentEvent): void;
    onBotStatus(e: BotStatusChangedEvent): void;
    onDocStatus(e: DocumentStatusChangedEvent): void;
    onReacted(e: MessageReactedEvent): void;
}
