import { forwardRef, Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { EMAIL_SENDER_PROVIDER } from './constants/messaging.tokens';
import { MessagingEmailController } from './controllers/messaging-email.controller';
import { MessagingCampaignController } from './controllers/messaging-campaign.controller';
import { EmailMessageLog } from './entities/email-message-log.entity';
import { MessagingCampaignRead } from './entities/messaging-campaign-read.entity';
import { MessagingCampaign } from './entities/messaging-campaign.entity';
import { PushInstallation } from './entities/push-installation.entity';
import { PushNotificationLog } from './entities/push-notification-log.entity';
import { AzureEmailProvider } from './providers/azure-email.provider';
import { MessagingPushController } from './controllers/messaging-push.controller';
import { EmailMessageLogService } from './services/email-message-log.service';
import { FirebasePushService } from './services/firebase-push.service';
import { MessagingMailComposerService } from './services/messaging-mail-composer.service';
import { MessagingCampaignService } from './services/messaging-campaign.service';
import { MessagingMailService } from './services/messaging-mail.service';
import { MessagingPushService } from './services/messaging-push.service';
import { PushNotificationLogService } from './services/push-notification-log.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      EmailMessageLog,
      MessagingCampaign,
      MessagingCampaignRead,
      PushInstallation,
      PushNotificationLog,
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          secret: configService.getOrThrow<string>('JWT_SECRET'),
          signOptions: {
            expiresIn: '2h',
          },
        };
      },
    }),
    forwardRef(() => AuthModule),
    RouterModule.register([
      {
        path: 'integrations/messaging',
        module: MessagingModule,
      },
    ]),
  ],
  controllers: [
    MessagingEmailController,
    MessagingPushController,
    MessagingCampaignController,
  ],
  providers: [
    AzureEmailProvider,
    FirebasePushService,
    {
      provide: EMAIL_SENDER_PROVIDER,
      useExisting: AzureEmailProvider,
    },
    EmailMessageLogService,
    PushNotificationLogService,
    MessagingMailComposerService,
    MessagingCampaignService,
    MessagingMailService,
    MessagingPushService,
  ],
  exports: [MessagingMailService, MessagingPushService, MessagingCampaignService],
})
export class MessagingModule {}
