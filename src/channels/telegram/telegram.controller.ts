import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentCustomer } from '@/shared/decorators/current-customer.decorator';
import { TelegramAdapter } from './telegram.adapter';
import { RegisterTelegramBotDto } from './dto/register-bot.dto';

@ApiTags('channels')
@ApiBearerAuth('jwt')
@Controller('channels/telegram')
export class TelegramController {
  constructor(private readonly adapter: TelegramAdapter) {}

  @Post('login')
  async startLogin(@CurrentCustomer() customerId: number) {
    return this.adapter.startLogin({ customerId });
  }

  @Post('register/:botId')
  async registerBot(
    @Param('botId') botId: string,
    @CurrentCustomer() customerId: number,
    @Body() body: RegisterTelegramBotDto,
  ) {
    void customerId;
    await this.adapter.registerBot(Number(botId), body.token, body.webhookUrl);
    return { ok: true };
  }

  @Post('logout/:botId')
  async logout(@Param('botId') botId: string) {
    await this.adapter.logout(Number(botId));
    return { ok: true };
  }
}
