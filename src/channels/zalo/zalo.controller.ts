import { Body, Controller, Get, NotFoundException, Param, Patch, Post, Query } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentCustomer } from '@/shared/decorators/current-customer.decorator';
import { ZaloQrStorageService } from './zalo-qr-storage.service';
import { ZaloAdapter } from './zalo.adapter';
import { ZaloZcaService } from './zalo-zca.service';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { UpdateZaloProfileDto } from './dto/update-zalo-profile.dto';

/**
 * Convenience wrapper for /channels/zalo/login (also reachable through the
 * generic /channels/:channel/login route in ChannelsController).
 */
@ApiTags('channels')
@ApiBearerAuth('jwt')
@Controller('channels/zalo')
export class ZaloController {
  constructor(
    private readonly adapter: ZaloAdapter,
    private readonly qrStorage: ZaloQrStorageService,
    private readonly zca: ZaloZcaService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('login')
  async startLogin(@CurrentCustomer() customerId: number) {
    return this.adapter.startLogin({ customerId });
  }

  @Get('qr')
  async getQrBase64() {
    const qrPath = this.qrStorage.getQrPath();

    try {
      const buffer = await fs.readFile(qrPath);
      const qrBase64 = buffer.toString('base64');

      if (!qrBase64) {
        throw new NotFoundException(`Zalo QR image is empty at ${qrPath}`);
      }

      return {
        qrBase64: `data:image/png;base64,${qrBase64}`,
        qrPath,
        qrDir: this.qrStorage.getQrDir(),
        rootDir: this.qrStorage.getRootDir(),
      };
    } catch (error) {
      throw new NotFoundException(
        `Zalo QR image is not ready yet at ${qrPath}: ${(error as Error).message}`,
      );
    }
  }

  @Get('status/:botId')
  async status(@Param('botId') botId: string) {
    return { status: await this.adapter.status(botId) };
  }

  @Post('logout/:botId')
  async logout(@Param('botId') botId: string) {
    await this.adapter.logout(Number(botId));
    return { ok: true };
  }

  @Get('profile/:botId')
  async getProfile(@Param('botId') botId: string) {
    return this.adapter.getProfile(Number(botId));
  }

  @Patch('profile/:botId')
  async updateProfile(
    @Param('botId') botId: string,
    @Body() body: UpdateZaloProfileDto,
  ) {
    return this.adapter.updateProfile(
      Number(botId),
      body.name,
      body.bio,
      body.avatar,
    );
  }

  @Get('stickers/:botId')
  async getStickers(
    @Param('botId') botId: string,
    @Query('keyword') keyword?: string,
  ) {
    const bot = await this.prisma.bot.findUnique({ where: { id: Number(botId) } });
    if (!bot) throw new NotFoundException(`Bot ${botId} not found`);
    const data = await this.zca.getStickers(bot.externalId, keyword);
    return { data };
  }
}
