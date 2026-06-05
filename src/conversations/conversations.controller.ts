import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  ConversationListItem,
  ConversationService,
} from './conversation.service';
import { MessageService } from './message.service';
import {
  ListConversationsQuery,
  ListMessagesQuery,
  ListParticipantsQuery,
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
  async list(
    @Param('channel') channel: string,
    @Param('externalId') externalId: string,
    @Query() query: ListConversationsQuery,
  ): Promise<{ items: ConversationListItem[]; nextCursor: number | null }> {
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

  @Get(':id/participants')
  participants(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: ListParticipantsQuery,
  ) {
    return this.conversations.listParticipants({
      conversationId: id,
      limit: query.limit,
      cursor: query.cursor,
    });
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

  @Patch(':id/auto-reply')
  async toggleAutoReply(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { autoReplyEnabled: boolean },
  ) {
    await this.conversations.updateAutoReply(id, body.autoReplyEnabled);
    return { ok: true };
  }
}
