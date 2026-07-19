import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { normalizeAppEnvironment } from 'src/common/utils/env.util';
import { FinanceModule } from 'src/finance/finance.module';
import { MessagingModule } from 'src/messaging/messaging.module';
import { SecurityModule } from 'src/security/security.module';
import { WhatsappTestController } from './controllers/whatsapp-test.controller';
import { WhatsappWebhookController } from './controllers/whatsapp-webhook.controller';
import { WhatsappLinkOrchestrator } from './orchestrators/whatsapp-link.orchestrator';
import { WhatsappCommandParserService } from './services/whatsapp-command-parser.service';
import { WhatsappConversationSessionService } from './services/whatsapp-conversation-session.service';
import { WhatsappMessageComposerService } from './services/whatsapp-message-composer.service';
import { WhatsappWebhookService } from './services/whatsapp-webhook.service';

const appEnvironment = normalizeAppEnvironment(
  process.env.APP_ENV ?? process.env.NODE_ENV,
);
const isProduction = appEnvironment === 'production';
const whatsappControllers = isProduction
  ? [WhatsappWebhookController]
  : [WhatsappWebhookController, WhatsappTestController];

@Module({
  imports: [
    SecurityModule,
    FinanceModule,
    MessagingModule,
    RouterModule.register([
      {
        path: 'integrations/whatsapp',
        module: WhatsappModule,
      },
    ]),
  ],
  controllers: whatsappControllers,
  providers: [
    WhatsappWebhookService,
    WhatsappLinkOrchestrator,
    WhatsappCommandParserService,
    WhatsappMessageComposerService,
    WhatsappConversationSessionService,
  ],
})
export class WhatsappModule {}
