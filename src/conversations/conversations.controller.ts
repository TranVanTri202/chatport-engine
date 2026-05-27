import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ConversationService } from './conversation.service';
import { MessageService } from './message.service';
import {
  ListConversationsQuery,
  ListMessagesQuery,
} from './dto/list-conversations.dto';

@ApiTags('conversations')
@ApiBearerAuth('jwt')
@Controller('conversations')
export class ConversationsController {
  constructor(
    private readonly conversations: ConversationService,
    private readonly messageService: MessageService,
  ) {}

  /** Conversation list for a bot. Cursor pagination (sort by lastMessageAt desc). */
  @Get()
  list(@Query() query: ListConversationsQuery) {
    return this.conversations.listForBot({
      botId: query.botId,
      limit: query.limit,
      cursor: query.cursor,
    });
  }

  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.conversations.getById(id);
  }

  /** Paginated chat history (newest first). `cursor` = last seen messageId. */
  @Get(':id/messages')
  messages(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: ListMessagesQuery,
  ) {
    return this.messageService.listByConversation({
      conversationId: id,
      limit: query.limit,
      cursor: query.cursor,
    });
  }

  @Post(':id/read')
  async markRead(@Param('id', ParseIntPipe) id: number) {
    await this.conversations.markRead(id);
    return { ok: true };
  }
}
