import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterTelegramBotDto {
  @ApiProperty({ description: 'Telegram Bot Token from BotFather', example: '123456:ABC-DEF...' })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ description: 'Optional custom webhook URL', required: false })
  @IsOptional()
  @IsString()
  webhookUrl?: string;
}
