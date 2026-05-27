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
import {
  AttachDocumentsDto,
  CreateBotDto,
  UpdateBotDto,
} from './dto/create-bot.dto';

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

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.bots.delete(id);
    return { ok: true };
  }

  // ── Document attachments ───────────────────────────────────────────

  @Get(':id/documents')
  listDocuments(@Param('id', ParseIntPipe) id: number) {
    return this.bots.listAttachedDocuments(id);
  }

  @Post(':id/documents')
  async attachDocuments(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AttachDocumentsDto,
  ) {
    await this.bots.attachDocuments(id, body);
    return { ok: true };
  }

  @Delete(':id/documents/:docId')
  async detachDocument(
    @Param('id', ParseIntPipe) id: number,
    @Param('docId', ParseIntPipe) docId: number,
  ) {
    await this.bots.detachDocument(id, docId);
    return { ok: true };
  }
}
