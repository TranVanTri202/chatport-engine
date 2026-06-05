import { TelegramAdapter } from './telegram.adapter';
import { RegisterTelegramBotDto } from './dto/register-bot.dto';
export declare class TelegramController {
    private readonly adapter;
    constructor(adapter: TelegramAdapter);
    startLogin(customerId: number): Promise<import("../channel-adapter.interface").StartLoginResult>;
    registerBot(botId: string, customerId: number, body: RegisterTelegramBotDto): Promise<{
        ok: boolean;
    }>;
    logout(botId: string): Promise<{
        ok: boolean;
    }>;
}
