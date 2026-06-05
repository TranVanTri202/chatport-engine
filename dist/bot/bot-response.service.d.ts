import { Bot } from '@prisma/client';
import { AppConfig } from '@/shared/config/app.config';
import { MessageReceivedEvent } from '@/shared/events/domain-events';
import { MessagingPublisher } from '@/messaging/messaging.publisher';
import { ReplyPolicyService } from '@/messaging/reply-policy.service';
import { MessageService } from '@/conversations/message.service';
import { ConversationService } from '@/conversations/conversation.service';
import { RetrievalService } from '@/rag/retrieval.service';
import { LlmService } from '@/llm/llm.service';
import { QuotaService } from '@/quota/quota.service';
export declare class BotResponseService {
    private readonly publisher;
    private readonly messages;
    private readonly conversations;
    private readonly retrieval;
    private readonly llm;
    private readonly config;
    private readonly policy;
    private readonly quota;
    private readonly logger;
    constructor(publisher: MessagingPublisher, messages: MessageService, conversations: ConversationService, retrieval: RetrievalService, llm: LlmService, config: AppConfig, policy: ReplyPolicyService, quota: QuotaService);
    private isWithinActiveHours;
    onMessageReceived(event: MessageReceivedEvent): Promise<void>;
    generateReply(bot: Bot, conversation: {
        id: number;
        name?: string | null;
    }, userText: string): Promise<{
        reply: string;
        contexts: any[];
    } | null>;
    private buildConversationState;
    private interpolateSystemPrompt;
    private conversationSummary;
    private updateRollingSummary;
    private formatSummaryInput;
    private normalizeSummary;
    private formatRecentHistory;
    private botOverrides;
}
