import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { BotSessionRepository } from './bot-session.repository';

@Global()
@Module({
  providers: [PrismaService, BotSessionRepository],
  exports: [PrismaService, BotSessionRepository],
})
export class PrismaModule {}
