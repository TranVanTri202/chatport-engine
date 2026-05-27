import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentCustomer } from '@/shared/decorators/current-customer.decorator';
import { ChannelType } from '@/shared/types';
import { ChannelRegistry } from './channel-registry.service';

@ApiTags('channels')
@ApiBearerAuth('jwt')
@Controller('channels')
export class ChannelsController {
  constructor(private readonly registry: ChannelRegistry) {}

  @Post(':channel/login')
  async startLogin(
    @CurrentCustomer() customerId: number,
    @Param('channel') channel: string,
  ) {
    const ch = this.parseChannel(channel);
    const adapter = this.registry.get(ch);
    return adapter.startLogin({ customerId });
  }

  @Post(':channel/logout/:botId')
  async logout(@Param('channel') channel: string, @Param('botId') botId: string) {
    const ch = this.parseChannel(channel);
    const adapter = this.registry.get(ch);
    await adapter.logout(Number(botId));
    return { ok: true };
  }

  private parseChannel(raw: string): ChannelType {
    const ch = raw as ChannelType;
    if (!Object.values(ChannelType).includes(ch)) {
      throw new BadRequestException(`Unknown channel: ${raw}`);
    }
    return ch;
  }
}
