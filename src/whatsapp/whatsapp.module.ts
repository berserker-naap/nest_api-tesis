import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { FinanceModule } from 'src/finance/finance.module';
import { SecurityModule } from 'src/security/security.module';
import { WhatsappTestController } from './controllers/whatsapp-test.controller';
import { WhatsappWebhookController } from './controllers/whatsapp-webhook.controller';
import { WhatsappLinkOrchestrator } from './orchestrators/whatsapp-link.orchestrator';
import { WhatsappCommandParserService } from './services/whatsapp-command-parser.service';
import { WhatsappConversationSessionService } from './services/whatsapp-conversation-session.service';
import { WhatsappMessageComposerService } from './services/whatsapp-message-composer.service';
import { WhatsappWebhookService } from './services/whatsapp-webhook.service';

@Module({
  imports: [
    SecurityModule,
    FinanceModule,
    RouterModule.register([
      {
        path: 'integrations/whatsapp',
        module: WhatsappModule,
      },
    ]),
  ],
  controllers: [WhatsappWebhookController, WhatsappTestController],
  providers: [
    WhatsappWebhookService,
    WhatsappLinkOrchestrator,
    WhatsappCommandParserService,
    WhatsappMessageComposerService,
    WhatsappConversationSessionService,
  ],
})
export class WhatsappModule {}
