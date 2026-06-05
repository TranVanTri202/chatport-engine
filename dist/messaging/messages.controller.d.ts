import { CommandBus } from '@nestjs/cqrs';
import { SendTextMessageDto } from './dto/send-text-message.dto';
import { SendImageFileDto } from './dto/send-image-file.dto';
import { BotService } from '@/bot/bot.service';
import { ConversationService } from '@/conversations/conversation.service';
import { MessageService } from '@/conversations/message.service';
import { RetrievalService } from '@/rag/retrieval.service';
import { LlmService } from '@/llm/llm.service';
import { AppConfig } from '@/shared/config/app.config';
import { BotResponseService } from '@/bot/bot-response.service';
import { ReactMessageDto } from './dto/react-message.dto';
import { ZaloZcaService } from '@/channels/zalo/zalo-zca.service';
export declare class MessagesController {
    private readonly commands;
    private readonly bots;
    private readonly conversations;
    private readonly messages;
    private readonly retrieval;
    private readonly llm;
    private readonly config;
    private readonly botResponse;
    private readonly zaloZca;
    constructor(commands: CommandBus, bots: BotService, conversations: ConversationService, messages: MessageService, retrieval: RetrievalService, llm: LlmService, config: AppConfig, botResponse: BotResponseService, zaloZca: ZaloZcaService);
    sendText(body: SendTextMessageDto): Promise<any>;
    sendImage(body: SendImageFileDto, file?: Express.Multer.File): Promise<any>;
    reactMessage(body: ReactMessageDto): Promise<{
        success: boolean;
    }>;
}
