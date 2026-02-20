import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { FinanceModule } from 'src/finance/finance.module';
import { Transaccion } from 'src/finance/entities/transaccion.entity';
import { AssistantController } from './controllers/assistant.controller';
import { AssistantMessage } from './entities/assistant-message.entity';
import { AssistantSession } from './entities/assistant-session.entity';
import { GeminiProvider } from './providers/gemini.provider';
import { AssistantChatService } from './services/assistant-chat.service';
import { AssistantCostService } from './services/assistant-cost.service';
import { AssistantDomainGuardService } from './services/assistant-domain-guard.service';
import { AssistantFinanceToolsService } from './services/assistant-finance-tools.service';
import { AssistantResponsePolicyService } from './services/assistant-response-policy.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([AssistantSession, AssistantMessage, Transaccion]),
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
    FinanceModule,
    RouterModule.register([
      {
        path: 'assistant',
        module: AssistantModule,
      },
    ]),
  ],
  controllers: [AssistantController],
  providers: [
    GeminiProvider,
    AssistantChatService,
    AssistantCostService,
    AssistantDomainGuardService,
    AssistantFinanceToolsService,
    AssistantResponsePolicyService,
  ],
  exports: [AssistantChatService],
})
export class AssistantModule {}
