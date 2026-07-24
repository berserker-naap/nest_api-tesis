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

type WhatsappTemplateTextParameter = {
  type: 'text';
  text: string;
};

type WhatsappTemplateBodyComponent = {
  type: 'body';
  parameters: WhatsappTemplateTextParameter[];
};

type WhatsappTemplateButtonComponent = {
  type: 'button';
  sub_type: 'url';
  index: string;
  parameters: WhatsappTemplateTextParameter[];
};

type WhatsappTemplateComponent =
  | WhatsappTemplateBodyComponent
  | WhatsappTemplateButtonComponent;

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
    components?: WhatsappTemplateComponent[],
  ): Promise<void> {
    const endpoint = this.getMessagesEndpoint();
    const cleanTo = this.resolveRecipient(toInternational);
    const template: {
      name: string;
      language: { code: string };
      components?: WhatsappTemplateComponent[];
    } = {
      name: templateName,
      language: {
        code: languageCode,
      },
    };

    if (components?.length) {
      template.components = components;
    }

    const body = {
      messaging_product: 'whatsapp',
      to: cleanTo,
      type: 'template',
      template,
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

  async sendOtpTemplateMessage(
    toInternational: string,
    code: string,
    meta?: WhatsappSendLogMeta,
  ): Promise<void> {
    const templateName =
      this.configService.get<string>('WHATSAPP_OTP_TEMPLATE_NAME') ??
      'authentication_code_copy_code_button';
    const languageCode =
      this.configService.get<string>('WHATSAPP_OTP_TEMPLATE_LANGUAGE') ?? 'es';
    const includeCopyCodeButton =
      String(
        this.configService.get<string>('WHATSAPP_OTP_TEMPLATE_COPY_CODE_BUTTON') ??
          'true',
      )
        .trim()
        .toLowerCase() !== 'false';

    const components: WhatsappTemplateComponent[] = [
      {
        type: 'body',
        parameters: [{ type: 'text', text: code }],
      },
    ];

    if (includeCopyCodeButton) {
      components.push({
        type: 'button',
        sub_type: 'url',
        index: '0',
        parameters: [{ type: 'text', text: code }],
      });
    }

    await this.sendTemplateMessage(
      toInternational,
      templateName,
      languageCode,
      {
        ...meta,
        inboundMessageId: meta?.inboundMessageId ?? 'otp_template',
      },
      components,
    );
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
    return originalToInternational.replace(/\D/g, '');
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
