import { Controller, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentCustomer } from '@/shared/decorators/current-customer.decorator';
import { ZaloAdapter } from './zalo.adapter';

/**
 * Convenience wrapper for /channels/zalo/login (also reachable through the
 * generic /channels/:channel/login route in ChannelsController).
 */
@ApiTags('channels')
@ApiBearerAuth('jwt')
@Controller('channels/zalo')
export class ZaloController {
  constructor(private readonly adapter: ZaloAdapter) {}

  @Post('login')
  async startLogin(@CurrentCustomer() customerId: number) {
    return this.adapter.startLogin({ customerId });
  }

  @Post('logout/:botId')
  async logout(@Param('botId') botId: string) {
    await this.adapter.logout(Number(botId));
    return { ok: true };
  }
}
