import { SendMessageCommand } from './commands/send-message.command';
export declare class SendMessageValidationService {
    validate(input: SendMessageCommand['input']): void;
    private validateChat;
    private validateImage;
}
