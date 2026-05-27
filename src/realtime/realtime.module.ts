import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AppConfig } from '@/shared/config/app.config';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeListener } from './realtime.listener';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [AppConfig],
      useFactory: (cfg: AppConfig) => ({
        secret: cfg.jwtSecret,
        signOptions: { expiresIn: cfg.jwtExpiresIn },
      }),
    }),
  ],
  providers: [RealtimeGateway, RealtimeListener],
  exports: [RealtimeGateway, JwtModule],
})
export class RealtimeModule {}
