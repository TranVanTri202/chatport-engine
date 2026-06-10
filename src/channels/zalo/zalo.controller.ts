import { Body, Controller, Get, NotFoundException, Param, Patch, Post } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CurrentCustomer } from '@/shared/decorators/current-customer.decorator';
import { ZaloQrStorageService } from './zalo-qr-storage.service';
import { ZaloAdapter } from './zalo.adapter';

export class UpdateZaloProfileDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  avatar?: string;
}

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
}
