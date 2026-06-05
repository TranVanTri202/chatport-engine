import { MessagingPublisher } from '@/messaging/messaging.publisher';
export declare class TelegramListeners {
    private readonly publisher;
    private readonly logger;
    constructor(publisher: MessagingPublisher);
    attach(bot: any, botExternalId: string): void;
    private normalizeMessage;
}
