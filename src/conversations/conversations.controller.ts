import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Delete,
  Query,
  BadRequestException,
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

  @Post('groups')
  async createGroup(
    @Param('channel') channel: string,
    @Param('externalId') externalId: string,
    @Body() body: { name: string; members: string[]; avatar?: string },
  ) {
    if (channel !== 'zalo') {
      throw new BadRequestException('Groups are only supported on Zalo');
    }
    return this.conversations.createGroup(externalId, body.name, body.members, body.avatar);
  }

  @Post(':id/leave')
  async leaveGroup(
    @Param('channel') channel: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    if (channel !== 'zalo') {
      throw new BadRequestException('Groups are only supported on Zalo');
    }
    await this.conversations.leaveGroup(id);
    return { ok: true };
  }

  @Post(':id/disperse')
  async disperseGroup(
    @Param('channel') channel: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    if (channel !== 'zalo') {
      throw new BadRequestException('Groups are only supported on Zalo');
    }
    await this.conversations.disperseGroup(id);
    return { ok: true };
  }

  @Post(':id/members')
  async inviteMember(
    @Param('channel') channel: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { userId: string },
  ) {
    if (channel !== 'zalo') {
      throw new BadRequestException('Groups are only supported on Zalo');
    }
    await this.conversations.inviteMember(id, body.userId);
    return { ok: true };
  }

  @Delete(':id/members/:userId')
  async removeMember(
    @Param('channel') channel: string,
    @Param('id', ParseIntPipe) id: number,
    @Param('userId') userId: string,
  ) {
    if (channel !== 'zalo') {
      throw new BadRequestException('Groups are only supported on Zalo');
    }
    await this.conversations.removeMember(id, userId);
    return { ok: true };
  }

  @Post(':id/deputies')
  async promoteDeputy(
    @Param('channel') channel: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { userId: string },
  ) {
    if (channel !== 'zalo') {
      throw new BadRequestException('Groups are only supported on Zalo');
    }
    await this.conversations.promoteDeputy(id, body.userId);
    return { ok: true };
  }

  @Delete(':id/deputies/:userId')
  async demoteDeputy(
    @Param('channel') channel: string,
    @Param('id', ParseIntPipe) id: number,
    @Param('userId') userId: string,
  ) {
    if (channel !== 'zalo') {
      throw new BadRequestException('Groups are only supported on Zalo');
    }
    await this.conversations.demoteDeputy(id, userId);
    return { ok: true };
  }

  @Post(':id/change-owner')
  async changeOwner(
    @Param('channel') channel: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { userId: string },
  ) {
    if (channel !== 'zalo') {
      throw new BadRequestException('Groups are only supported on Zalo');
    }
    await this.conversations.changeOwner(id, body.userId);
    return { ok: true };
  }

  @Patch(':id/group-settings')
  async updateGroupSettings(
    @Param('channel') channel: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    if (channel !== 'zalo') {
      throw new BadRequestException('Groups are only supported on Zalo');
    }
    await this.conversations.updateGroupSettings(id, body);
    return { ok: true };
  }

  @Get(':id/pending-members')
  async getPendingMembers(
    @Param('channel') channel: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    if (channel !== 'zalo') {
      throw new BadRequestException('Groups are only supported on Zalo');
    }
    return this.conversations.getPendingMembers(id);
  }

  @Post(':id/pending-members/review')
  async reviewPendingMember(
    @Param('channel') channel: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { userId: string; approve: boolean },
  ) {
    if (channel !== 'zalo') {
      throw new BadRequestException('Groups are only supported on Zalo');
    }
    await this.conversations.reviewPendingMember(id, body.userId, body.approve);
    return { ok: true };
  }

  @Patch(':id/title')
  async changeGroupName(
    @Param('channel') channel: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { title: string },
  ) {
    if (channel !== 'zalo') {
      throw new BadRequestException('Groups are only supported on Zalo');
    }
    await this.conversations.changeGroupName(id, body.title);
    return { ok: true };
  }

  @Post(':id/avatar')
  async changeGroupAvatar(
    @Param('channel') channel: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { avatar: string },
  ) {
    if (channel !== 'zalo') {
      throw new BadRequestException('Groups are only supported on Zalo');
    }
    await this.conversations.changeGroupAvatar(id, body.avatar);
    return { ok: true };
  }
}
