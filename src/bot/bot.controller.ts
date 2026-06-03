import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentCustomer } from '@/shared/decorators/current-customer.decorator';
import { ChannelType } from '@/shared/types';
import { BotService } from './bot.service';
import { CreateBotDto, UpdateBotDto } from './dto/create-bot.dto';

@ApiTags('bots')
@ApiBearerAuth('jwt')
@Controller('bots')
export class BotController {
  constructor(private readonly bots: BotService) {}

  @Get()
  list(@CurrentCustomer() customerId: number) {
    return this.bots.list(customerId);
  }

  @Get(':channel/:externalId')
  detail(
    @Param('channel') channel: ChannelType,
    @Param('externalId') externalId: string,
  ) {
    return this.bots.getByExternal(channel, externalId).then((bot) => ({ bot }));
  }

  @Post()
  create(
    @CurrentCustomer() customerId: number,
    @Body() body: Omit<CreateBotDto, 'customerId'>,
  ) {
    return this.bots.create({ ...body, customerId } as CreateBotDto);
  }

  @Patch(':channel/:externalId')
  update(
    @Param('channel') channel: ChannelType,
    @Param('externalId') externalId: string,
    @Body() body: UpdateBotDto,
  ) {
    return this.bots.getByExternal(channel, externalId).then((bot) => this.bots.update(bot.id, body));
  }

  @Get(':channel/:externalId/temperature')
  getTemperature(
    @Param('channel') channel: ChannelType,
    @Param('externalId') externalId: string,
  ) {
    return this.bots.getByExternal(channel, externalId).then(({ temperature }) => ({ temperature: temperature ?? 0.5 }));
  }

  @Patch(':channel/:externalId/temperature')
  updateTemperature(
    @Param('channel') channel: ChannelType,
    @Param('externalId') externalId: string,
    @Body() body: { temperature: number },
  ) {
    return this.bots.getByExternal(channel, externalId).then((bot) => this.bots.update(bot.id, { temperature: body.temperature }));
  }

  @Delete(':channel/:externalId')
  async remove(
    @Param('channel') channel: ChannelType,
    @Param('externalId') externalId: string,
  ) {
    const bot = await this.bots.getByExternal(channel, externalId);
    await this.bots.delete(bot.id);
    return { ok: true };
  }

  @Get(':channel/:externalId/system-prompt')
  getSystemPrompt(
    @Param('channel') channel: ChannelType,
    @Param('externalId') externalId: string,
  ) {
    return this.bots.getSystemPrompt(channel, externalId);
  }

  @Patch(':channel/:externalId/system-prompt')
  updateSystemPrompt(
    @Param('channel') channel: ChannelType,
    @Param('externalId') externalId: string,
    @Body() body: { systemPrompt: string },
  ) {
    return this.bots.updateSystemPrompt(channel, externalId, body.systemPrompt);
  }
}
