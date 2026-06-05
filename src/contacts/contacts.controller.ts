import { Controller, Get, Param, Post, ParseIntPipe, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ContactsService } from './contacts.service';
import { ChannelType } from '@/shared/types';

@ApiTags('contacts')
@ApiBearerAuth('jwt')
@Controller('bots/:channel/:externalId/contacts')
export class ContactsController {
  constructor(private readonly contacts: ContactsService) {}

  @Get()
  getContacts(
    @Param('channel') channel: ChannelType,
    @Param('externalId') externalId: string,
  ) {
    return this.contacts.getContacts(channel, externalId);
  }

  @Get('requests')
  getFriendRequests(
    @Param('channel') channel: ChannelType,
    @Param('externalId') externalId: string,
  ) {
    return this.contacts.getFriendRequests(channel, externalId);
  }

  @Post('requests/:requestId/accept')
  accept(
    @Param('channel') channel: ChannelType,
    @Param('externalId') externalId: string,
    @Param('requestId', ParseIntPipe) requestId: number,
  ) {
    return this.contacts.acceptFriendRequest(channel, externalId, requestId);
  }

  @Post('requests/:requestId/decline')
  decline(
    @Param('channel') channel: ChannelType,
    @Param('externalId') externalId: string,
    @Param('requestId', ParseIntPipe) requestId: number,
  ) {
    return this.contacts.declineFriendRequest(channel, externalId, requestId);
  }

  @Get('search/:phone')
  findUser(
    @Param('channel') channel: ChannelType,
    @Param('externalId') externalId: string,
    @Param('phone') phone: string,
  ) {
    return this.contacts.findUser(channel, externalId, phone);
  }

  @Post('add-friend')
  sendFriendRequest(
    @Param('channel') channel: ChannelType,
    @Param('externalId') externalId: string,
    @Body() body: { userId: string; message?: string },
  ) {
    return this.contacts.sendFriendRequest(channel, externalId, body.userId, body.message ?? '');
  }

  @Post('chat')
  getOrCreateConversation(
    @Param('channel') channel: ChannelType,
    @Param('externalId') externalId: string,
    @Body() body: { userId: string; displayName: string; avatar?: string },
  ) {
    return this.contacts.getOrCreateConversation(channel, externalId, body.userId, body.displayName, body.avatar ?? null);
  }
}
