import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AppConfig } from '@/shared/config/app.config';
import { ZaloModule } from '@/channels/zalo/zalo.module';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeListener } from './realtime.listener';

@Module({
  imports: [
    forwardRef(() => ZaloModule),
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
