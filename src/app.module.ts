import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { SecurityModule } from './security/security.module';
import { BusinessparamModule } from './businessparam/businessparam.module';
import { FinanceModule } from './finance/finance.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { AssistantModule } from './assistant/assistant.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { MessagingModule } from './messaging/messaging.module';
import { ServiceErrorLog } from './common/entity/service-error-log.entity';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { RequestContextService } from './common/services/request-context.service';
import { ServiceErrorInstrumentationService } from './common/services/service-error-instrumentation.service';
import { ServiceErrorLogService } from './common/services/service-error-log.service';
import {
  isProductionEnv,
  toBooleanEnv,
  toNumberEnv,
} from './common/utils/env.util';

const isProduction = isProductionEnv(
  process.env.APP_ENV ?? process.env.NODE_ENV,
);

@Module({
  imports: [
    ConfigModule.forRoot(),
    DiscoveryModule,
    TypeOrmModule.forRoot({
      type: 'mssql',
      host: process.env.DB_HOST,
      port: toNumberEnv(process.env.DB_PORT, 1433),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: toBooleanEnv(process.env.DB_SYNCHRONIZE, false),
      logging: toBooleanEnv(process.env.DB_LOGGING, false),
      requestTimeout: toNumberEnv(process.env.DB_REQUEST_TIMEOUT_MS, 30000),
      options: {
        encrypt: toBooleanEnv(process.env.DB_ENCRYPT, true),
        trustServerCertificate: toBooleanEnv(
          process.env.DB_TRUST_SERVER_CERTIFICATE,
          !isProduction,
        ),
        connectTimeout: toNumberEnv(process.env.DB_CONNECT_TIMEOUT_MS, 30000),
      },
    }),
    TypeOrmModule.forFeature([ServiceErrorLog]),
    AuthModule,
    SecurityModule,
    BusinessparamModule,
    FinanceModule,
    WhatsappModule,
    MessagingModule,
    AssistantModule,
    AnalyticsModule,
  ],
  controllers: [],
  providers: [
    RequestContextService,
    ServiceErrorLogService,
    ServiceErrorInstrumentationService,
    AllExceptionsFilter,
  ],
})
export class AppModule {}
