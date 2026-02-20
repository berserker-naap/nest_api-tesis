import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { Transaccion } from 'src/finance/entities/transaccion.entity';
import { DashboardAnalyticsController } from './controllers/dashboard-analytics.controller';
import { DashboardAnalyticsService } from './services/dashboard-analytics.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Transaccion]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          secret: configService.get('JWT_SECRET'),
          signOptions: {
            expiresIn: '2h',
          },
        };
      },
    }),
    AuthModule,
    RouterModule.register([
      {
        path: 'analytics',
        module: AnalyticsModule,
      },
    ]),
  ],
  controllers: [DashboardAnalyticsController],
  providers: [DashboardAnalyticsService],
  exports: [DashboardAnalyticsService],
})
export class AnalyticsModule {}
