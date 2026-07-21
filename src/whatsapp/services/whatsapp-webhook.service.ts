import { Injectable } from '@nestjs/common';
import { StatusResponse } from 'src/common/dto/response.dto';
import { WhatsappMessageLogService } from 'src/common/services/whatsapp-message-log.service';
import { WhatsappSenderService } from 'src/common/services/whatsapp-sender.service';
import { TransaccionFinanceService } from 'src/finance/services/transaccion-finance.service';
import { MessagingPushService } from 'src/messaging/services/messaging-push.service';
import { Usuario } from 'src/security/entities/usuario.entity';
import { ProfilePhoneLookupStatus } from 'src/security/enums/profile-phone-lookup-status.enum';
import { OtpVerificacionService } from 'src/security/services/otp-verificacion.service';
import { WhatsappLinkOrchestrator } from '../orchestrators/whatsapp-link.orchestrator';
import {
  ParsedWhatsappCommand,
  WhatsappCommandParserService,
} from './whatsapp-command-parser.service';
import { WhatsappConversationSessionService } from './whatsapp-conversation-session.service';
import { WhatsappMessageComposerService } from './whatsapp-message-composer.service';

type IncomingWhatsappMessage = {
  from: string;
  messageId: string;
  text: string;
  rawMessage: unknown;
};

type WhatsappProviderStatus = {
  id: string;
  status: string;
  recipientId: string;
  timestamp?: string | number | null;
  conversationId?: string | null;
  pricingCategory?: string | null;
  errorMessage?: string | null;
  rawStatus: unknown;
};

@Injectable()
export class WhatsappWebhookService {
  private readonly sessionResetMinutes = this.toBoundedNumber(
    process.env.WHATSAPP_SESSION_RESET_MINUTES,
    60,
    5,
    1440,
  );
  private readonly noReplyCloseMinutes = this.toBoundedNumber(
    process.env.WHATSAPP_NO_REPLY_CLOSE_MINUTES,
    5,
    1,
    120,
  );

  constructor(
    private readonly transaccionFinanceService: TransaccionFinanceService,
    private readonly messagingPushService: MessagingPushService,
    private readonly whatsappLinkOrchestrator: WhatsappLinkOrchestrator,
    private readonly whatsappSenderService: WhatsappSenderService,
    private readonly whatsappMessageLogService: WhatsappMessageLogService,
    private readonly otpVerificacionService: OtpVerificacionService,
    private readonly whatsappCommandParserService: WhatsappCommandParserService,
    private readonly whatsappMessageComposerService: WhatsappMessageComposerService,
    private readonly whatsappConversationSessionService: WhatsappConversationSessionService,
  ) {}

  verifyWebhook(
    mode?: string,
    token?: string,
    challenge?: string,
  ): string | null {
    const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN;
    if (
      mode === 'subscribe' &&
      token &&
      expectedToken &&
      token === expectedToken
    ) {
      return challenge ?? '';
    }
    return null;
  }

  async processIncoming(payload: any): Promise<StatusResponse<any>> {
    try {
      const statuses = this.extractStatuses(payload);
      for (const status of statuses) {
        await this.processProviderStatus(status);
      }

      const messages = this.extractMessages(payload);
      for (const item of messages) {
        await this.processIncomingMessage(item);
      }

      return new StatusResponse(true, 200, 'Webhook procesado', null);
    } catch (error) {
      console.error('Error procesando webhook WhatsApp:', error);
      return new StatusResponse(false, 500, 'Error procesando webhook', error);
    }
  }

  private async processProviderStatus(
    item: WhatsappProviderStatus,
  ): Promise<void> {
    await this.whatsappMessageLogService.logProviderStatus({
      status: item.status,
      phone: item.recipientId,
      providerMessageId: item.id,
      timestamp: item.timestamp,
      conversationId: item.conversationId,
      pricingCategory: item.pricingCategory,
      errorMessage: item.errorMessage,
      payload: item.rawStatus,
    });
  }

  private async processIncomingMessage(
    item: IncomingWhatsappMessage,
  ): Promise<void> {
    const hadPendingClose =
      this.whatsappConversationSessionService.consumePendingClose(item.from);

    const alreadyProcessed =
      await this.whatsappMessageLogService.existsIncomingMessage(item.messageId);
    if (alreadyProcessed) {
      return;
    }

    const shouldSendSessionWelcome =
      await this.whatsappMessageLogService.isIncomingSessionExpired(
        item.from,
        this.sessionResetMinutes,
      );

    await this.whatsappMessageLogService.logIncoming({
      status: 'RECEIVED',
      phone: item.from,
      providerMessageId: item.messageId,
      text: item.text,
      payload: item.rawMessage,
      ip: item.from,
    });

    const linkedPhone =
      await this.whatsappLinkOrchestrator.resolveByInternationalPhone(item.from);

    if (
      linkedPhone.status === ProfilePhoneLookupStatus.NOT_ASSOCIATED ||
      !linkedPhone.usuario
    ) {
      await this.sendReply(
        item.from,
        this.whatsappMessageComposerService.buildNotAssociated(),
        null,
        item.messageId,
      );
      return;
    }

    if (linkedPhone.status === ProfilePhoneLookupStatus.PENDING) {
      const { plainCode } = await this.otpVerificacionService.createOtp({
        usuario: { id: linkedPhone.usuario.id } as Usuario,
        canal: 'WHATSAPP',
        destino: item.from,
      });
      await this.sendReply(
        item.from,
        this.whatsappMessageComposerService.buildPendingOtp(plainCode),
        linkedPhone.usuario,
        item.messageId,
      );
      return;
    }

    const user = {
      id: linkedPhone.usuario.id,
      login: linkedPhone.usuario.login,
    } as Usuario;

    if (
      hadPendingClose &&
      this.whatsappCommandParserService.shouldCloseConversation(item.text)
    ) {
      await this.sendReply(
        item.from,
        this.whatsappMessageComposerService.buildCloseAcknowledgement(user.login),
        user,
        item.messageId,
      );
      return;
    }

    if (
      hadPendingClose &&
      this.whatsappCommandParserService.shouldContinueConversation(item.text)
    ) {
      await this.sendReply(
        item.from,
        this.whatsappMessageComposerService.buildContinuePrompt(user.login),
        user,
        item.messageId,
      );
      return;
    }

    if (shouldSendSessionWelcome) {
      await this.sendReply(
        item.from,
        this.whatsappMessageComposerService.buildSessionWelcome(user.login),
        user,
        item.messageId,
      );

      if (this.whatsappCommandParserService.shouldSendQuickHelp(item.text)) {
        return;
      }
    }

    if (this.whatsappCommandParserService.shouldSendQuickHelp(item.text)) {
      await this.sendReply(
        item.from,
        this.whatsappMessageComposerService.buildQuickHelp(user.login),
        user,
        item.messageId,
      );
      return;
    }

    const parsed = this.whatsappCommandParserService.parseTextToCommand(
      item.text,
    );
    if (!parsed) {
      await this.sendReply(
        item.from,
        this.whatsappMessageComposerService.buildUnknownFormat(user.login),
        user,
        item.messageId,
      );
      return;
    }

    if (parsed.kind === 'HELP') {
      await this.sendReply(
        item.from,
        this.whatsappMessageComposerService.buildQuickHelp(user.login),
        user,
        item.messageId,
      );
      return;
    }

    if (parsed.kind === 'MOVEMENT') {
      await this.handleMovementCommand(item, user, parsed);
      return;
    }

    await this.handleTransferCommand(item, user, parsed);
  }

  private async handleMovementCommand(
    item: IncomingWhatsappMessage,
    user: Usuario,
    command: Extract<ParsedWhatsappCommand, { kind: 'MOVEMENT' }>,
  ): Promise<void> {
    const result = await this.transaccionFinanceService.createFromWhatsapp(
      command.dto,
      user,
      command.tipo,
      item.messageId,
      item.from,
    );

    if (!result.ok) {
      await this.sendReply(
        item.from,
        this.whatsappMessageComposerService.buildMovementError(
          user.login,
          result.message,
        ),
        user,
        item.messageId,
      );
      return;
    }

    const payload = (result.data ?? {}) as {
      idTransaccion?: number;
      monto?: number;
      saldoActual?: number;
      tipo?: string;
    };
    const isAlreadyProcessed = String(result.message ?? '')
      .trim()
      .toLowerCase() === 'mensaje ya procesado';

    await this.sendReply(
      item.from,
      this.whatsappMessageComposerService.buildMovementSuccess(
        user.login,
        result.message,
        payload,
      ),
      user,
      item.messageId,
      {
        idTransaccion: payload.idTransaccion ?? null,
      },
    );
    if (!isAlreadyProcessed) {
      await this.sendMovementPushNotification(user, payload, item.from);
    }
    this.scheduleNoReplyClose(item.from, user);
  }

  private async handleTransferCommand(
    item: IncomingWhatsappMessage,
    user: Usuario,
    command: Extract<ParsedWhatsappCommand, { kind: 'TRANSFER' }>,
  ): Promise<void> {
    const transferResult = await this.transaccionFinanceService.createTransferencia(
      command.dto,
      user,
      item.from,
    );

    if (!transferResult.ok) {
      await this.sendReply(
        item.from,
        this.whatsappMessageComposerService.buildTransferError(
          user.login,
          transferResult.message,
        ),
        user,
        item.messageId,
      );
      return;
    }

    const transferData = (transferResult.data ?? {}) as {
      idTransaccionSalida?: number;
      idTransaccionEntrada?: number;
      monto?: number;
      idCuentaOrigen?: number;
      idCuentaDestino?: number;
    };

    await this.sendReply(
      item.from,
      this.whatsappMessageComposerService.buildTransferSuccess(
        user.login,
        transferData,
      ),
      user,
      item.messageId,
      {
        idTransaccion: transferData.idTransaccionSalida ?? null,
      },
    );
    await this.sendTransferPushNotification(user, transferData, item.from);
    this.scheduleNoReplyClose(item.from, user);
  }

  private scheduleNoReplyClose(
    phone: string,
    user: Pick<Usuario, 'id' | 'login'>,
  ): void {
    this.whatsappConversationSessionService.schedulePendingClose(
      phone,
      this.noReplyCloseMinutes,
      async () => {
        await this.sendReply(
          phone,
          this.whatsappMessageComposerService.buildInactivityClose(user.login),
          user,
        );
      },
    );
  }

  private async sendReply(
    toInternational: string,
    message: string,
    usuario: Pick<Usuario, 'id' | 'login'> | null,
    inboundMessageId?: string,
    extra?: { idTransaccion?: number | null },
  ): Promise<void> {
    await this.whatsappSenderService.sendTextMessage(toInternational, message, {
      inboundMessageId: inboundMessageId ?? null,
      idUsuario: usuario?.id ?? null,
      usuarioLogin: usuario?.login ?? null,
      idTransaccion: extra?.idTransaccion ?? null,
      ip: toInternational,
    });
  }

  private async sendMovementPushNotification(
    usuario: Usuario,
    payload: {
      idTransaccion?: number;
      monto?: number;
      saldoActual?: number;
      tipo?: string;
    },
    ip: string,
  ): Promise<void> {
    const tipo = String(payload.tipo ?? 'MOVIMIENTO').trim().toUpperCase();
    const title =
      tipo === 'INGRESO'
        ? 'Ingreso registrado desde WhatsApp'
        : 'Egreso registrado desde WhatsApp';
    const messageParts = [
      typeof payload.monto === 'number'
        ? `Monto S/ ${Number(payload.monto).toFixed(2)}`
        : null,
      payload.idTransaccion ? `ID ${payload.idTransaccion}` : null,
      typeof payload.saldoActual === 'number'
        ? `Saldo S/ ${Number(payload.saldoActual).toFixed(2)}`
        : null,
    ].filter(Boolean);
    const message =
      messageParts.length > 0
        ? messageParts.join(' | ')
        : 'Se registro un movimiento desde WhatsApp.';

    await this.safeSendPush(
      usuario,
      ip,
      title,
      message,
      '/tabs/movimientos',
      {
        tipo: 'TRANSACCION_WHATSAPP',
        subtipo: tipo,
        idTransaccion: payload.idTransaccion ?? '',
      },
    );
  }

  private async sendTransferPushNotification(
    usuario: Usuario,
    payload: {
      idTransaccionSalida?: number;
      idTransaccionEntrada?: number;
      monto?: number;
      idCuentaOrigen?: number;
      idCuentaDestino?: number;
    },
    ip: string,
  ): Promise<void> {
    const messageParts = [
      typeof payload.monto === 'number'
        ? `Monto S/ ${Number(payload.monto).toFixed(2)}`
        : null,
      payload.idCuentaOrigen && payload.idCuentaDestino
        ? `Cuenta ${payload.idCuentaOrigen} -> ${payload.idCuentaDestino}`
        : null,
      payload.idTransaccionSalida
        ? `Salida ID ${payload.idTransaccionSalida}`
        : null,
    ].filter(Boolean);
    const message =
      messageParts.length > 0
        ? messageParts.join(' | ')
        : 'Se registro una transferencia desde WhatsApp.';

    await this.safeSendPush(
      usuario,
      ip,
      'Transferencia registrada desde WhatsApp',
      message,
      '/tabs/movimientos',
      {
        tipo: 'TRANSFERENCIA_WHATSAPP',
        idTransaccionSalida: payload.idTransaccionSalida ?? '',
        idTransaccionEntrada: payload.idTransaccionEntrada ?? '',
      },
    );
  }

  private async safeSendPush(
    usuario: Usuario,
    ip: string,
    title: string,
    message: string,
    deepLink: string,
    variables?: Record<string, string | number | boolean | null>,
  ): Promise<void> {
    try {
      const result = await this.messagingPushService.sendTemplate(
        {
          tagExpression: `user:${usuario.id}`,
          title,
          message,
          deepLink,
          variables,
        },
        usuario,
        ip,
      );

      if (!result.ok) {
        console.error('Push post-WhatsApp no enviado:', result.message);
      }
    } catch (error) {
      console.error('Error enviando push post-WhatsApp:', error);
    }
  }

  private extractMessages(payload: any): IncomingWhatsappMessage[] {
    const result: IncomingWhatsappMessage[] = [];
    const entries = payload?.entry ?? [];

    for (const entry of entries) {
      const changes = entry?.changes ?? [];
      for (const change of changes) {
        const values = change?.value;
        const messages = values?.messages ?? [];
        for (const msg of messages) {
          if (!msg?.from || !msg?.id || !msg?.text?.body) continue;
          const normalizedFrom = String(msg.from).replace(/\D/g, '');
          if (!normalizedFrom) continue;
          result.push({
            from: normalizedFrom,
            messageId: msg.id,
            text: msg.text.body,
            rawMessage: msg,
          });
        }
      }
    }

    return result;
  }

  private extractStatuses(payload: any): WhatsappProviderStatus[] {
    const result: WhatsappProviderStatus[] = [];
    const entries = payload?.entry ?? [];

    for (const entry of entries) {
      const changes = entry?.changes ?? [];
      for (const change of changes) {
        const values = change?.value;
        const statuses = values?.statuses ?? [];
        for (const status of statuses) {
          if (!status?.id || !status?.status) continue;
          const recipientId = String(status.recipient_id ?? '').replace(/\D/g, '');
          const normalizedStatus = String(status.status).trim().toUpperCase();
          if (!recipientId || !normalizedStatus) continue;

          result.push({
            id: String(status.id),
            status: normalizedStatus,
            recipientId,
            timestamp: status.timestamp ?? null,
            conversationId: status.conversation?.id ?? null,
            pricingCategory: status.pricing?.category ?? null,
            errorMessage: this.extractStatusErrorMessage(status),
            rawStatus: status,
          });
        }
      }
    }

    return result;
  }

  private extractStatusErrorMessage(status: any): string | null {
    const errors = Array.isArray(status?.errors) ? status.errors : [];
    if (errors.length === 0) {
      return null;
    }

    return errors
      .map((error) => {
        const code = error?.code ? `code=${error.code}` : null;
        const title = error?.title ? `title=${error.title}` : null;
        const message = error?.message ? `message=${error.message}` : null;
        return [code, title, message].filter(Boolean).join(', ');
      })
      .filter(Boolean)
      .join(' | ');
  }

  private toBoundedNumber(
    raw: string | undefined,
    fallback: number,
    min: number,
    max: number,
  ): number {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }
    return Math.max(min, Math.min(max, Math.floor(parsed)));
  }
}
