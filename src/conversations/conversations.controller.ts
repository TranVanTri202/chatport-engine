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
@Controller('bots/:channel/:externalId/conversations')
export class ConversationsController {
  constructor(
    private readonly conversations: ConversationService,
    private readonly messageService: MessageService,
  ) {}

  @Get()
  list(
    @Param('channel') channel: string,
    @Param('externalId') externalId: string,
    @Query() query: ListConversationsQuery,
  ) {
    return this.conversations.listForBot({
      channel: channel as any,
      externalId,
      limit: query.limit,
      cursor: query.cursor,
    });
  }

  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.conversations.getById(id);
  }

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
