import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentCustomer } from '@/shared/decorators/current-customer.decorator';
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

  /** Bot detail with conversation/document counts + quota usage (UI screen). */
  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.bots.getDetailed(id);
  }

  @Post()
  create(
    @CurrentCustomer() customerId: number,
    @Body() body: Omit<CreateBotDto, 'customerId'>,
  ) {
    return this.bots.create({ ...body, customerId } as CreateBotDto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateBotDto) {
    return this.bots.update(id, body);
  }

  @Get(':id/temperature')
  getTemperature(@Param('id', ParseIntPipe) id: number) {
    return this.bots.getDetailed(id).then(({ bot }) => ({ temperature: bot.temperature ?? 0.5 }));
  }

  @Patch(':id/temperature')
  updateTemperature(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { temperature: number },
  ) {
    return this.bots.update(id, { temperature: body.temperature });
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.bots.delete(id);
    return { ok: true };
  }

  @Get(':id/system-prompt')
  getSystemPrompt(@Param('id', ParseIntPipe) id: number) {
    return this.bots.getSystemPrompt(id);
  }

  @Patch(':id/system-prompt')
  updateSystemPrompt(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { systemPrompt: string },
  ) {
    return this.bots.updateSystemPrompt(id, body.systemPrompt);
  }
}
