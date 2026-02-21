import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsappMessageLogService } from './whatsapp-message-log.service';

export type WhatsappSendLogMeta = {
  providerMessageId?: string | null;
  inboundMessageId?: string | null;
  idUsuario?: number | null;
  usuarioLogin?: string | null;
  idTransaccion?: number | null;
  ip?: string | null;
};

@Injectable()
export class WhatsappSenderService {
  constructor(
    private readonly configService: ConfigService,
    private readonly whatsappMessageLogService: WhatsappMessageLogService,
  ) {}

  async sendTextMessage(
    toInternational: string,
    message: string,
    meta?: WhatsappSendLogMeta,
  ): Promise<void> {
    const endpoint = this.getMessagesEndpoint();
    const cleanTo = this.resolveRecipient(toInternational);
    const body = {
      messaging_product: 'whatsapp',
      to: cleanTo,
      type: 'text',
      text: {
        body: message,
      },
    };

    try {
      const providerMessageId = await this.sendRequest(endpoint, body);
      await this.whatsappMessageLogService.logOutgoing({
        status: 'SENT',
        phone: cleanTo,
        providerMessageId: providerMessageId ?? meta?.providerMessageId ?? null,
        idUsuario: meta?.idUsuario ?? null,
        usuarioLogin: meta?.usuarioLogin ?? null,
        idTransaccion: meta?.idTransaccion ?? null,
        text: message,
        payload: body,
        detail: meta?.inboundMessageId ?? null,
        ip: meta?.ip ?? null,
      });
    } catch (error) {
      await this.whatsappMessageLogService.logOutgoing({
        status: 'FAILED',
        phone: cleanTo,
        providerMessageId: meta?.providerMessageId ?? null,
        idUsuario: meta?.idUsuario ?? null,
        usuarioLogin: meta?.usuarioLogin ?? null,
        idTransaccion: meta?.idTransaccion ?? null,
        text: message,
        payload: body,
        detail: error instanceof Error ? error.message : 'error_no_controlado',
        ip: meta?.ip ?? null,
      });
      throw error;
    }
  }

  async sendTemplateMessage(
    toInternational: string,
    templateName: string,
    languageCode = 'en_US',
    meta?: WhatsappSendLogMeta,
  ): Promise<void> {
    const endpoint = this.getMessagesEndpoint();
    const cleanTo = this.resolveRecipient(toInternational);
    const body = {
      messaging_product: 'whatsapp',
      to: cleanTo,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: languageCode,
        },
      },
    };

    const templateSummary = `[template:${templateName}|lang:${languageCode}]`;
    try {
      const providerMessageId = await this.sendRequest(endpoint, body);
      await this.whatsappMessageLogService.logOutgoing({
        status: 'SENT',
        phone: cleanTo,
        providerMessageId: providerMessageId ?? meta?.providerMessageId ?? null,
        idUsuario: meta?.idUsuario ?? null,
        usuarioLogin: meta?.usuarioLogin ?? null,
        idTransaccion: meta?.idTransaccion ?? null,
        text: templateSummary,
        payload: body,
        detail: meta?.inboundMessageId ?? null,
        ip: meta?.ip ?? null,
      });
    } catch (error) {
      await this.whatsappMessageLogService.logOutgoing({
        status: 'FAILED',
        phone: cleanTo,
        providerMessageId: meta?.providerMessageId ?? null,
        idUsuario: meta?.idUsuario ?? null,
        usuarioLogin: meta?.usuarioLogin ?? null,
        idTransaccion: meta?.idTransaccion ?? null,
        text: templateSummary,
        payload: body,
        detail: error instanceof Error ? error.message : 'error_no_controlado',
        ip: meta?.ip ?? null,
      });
      throw error;
    }
  }

  private getMessagesEndpoint(): string {
    const accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID');
    const apiVersion = this.configService.get<string>('WHATSAPP_API_VERSION') ?? 'v22.0';

    if (!accessToken || !phoneNumberId) {
      throw new InternalServerErrorException(
        'Falta configuracion WhatsApp (WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID)',
      );
    }

    return `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
  }

  private resolveRecipient(originalToInternational: string): string {
    const testModeRaw = this.configService.get<string>('WHATSAPP_TEST_MODE');
    const isTestMode = ['1', 'true', 'yes', 'on'].includes(
      (testModeRaw ?? '').trim().toLowerCase(),
    );

    const resolvedNumber = isTestMode
      ? this.configService.get<string>('WHATSAPP_TEST_PHONE_NUMBER') ?? '51923983014'
      : originalToInternational;

    return resolvedNumber.replace(/\D/g, '');
  }

  private async sendRequest(
    endpoint: string,
    body: object,
  ): Promise<string | null> {
    const accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN');
    if (!accessToken) {
      throw new InternalServerErrorException(
        'Falta configuracion WhatsApp (WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID)',
      );
    }
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new InternalServerErrorException(
        `No se pudo enviar mensaje por WhatsApp. Detalle: ${detail}`,
      );
    }

    try {
      const payload = (await response.json()) as {
        messages?: Array<{ id?: string }>;
      };
      return payload?.messages?.[0]?.id ?? null;
    } catch {
      return null;
    }
  }
}
