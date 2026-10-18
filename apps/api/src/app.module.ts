import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { WalletModule } from './wallet/wallet.module';
import { MarketModule } from './markets/market.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../../.env' }),
    PrismaModule,
    JwtModule.register({ global: true }),
    AuthModule,
    WalletModule,
    MarketModule,
    AdminModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
