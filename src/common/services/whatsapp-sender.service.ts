import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhatsappSenderService {
  constructor(private readonly configService: ConfigService) {}

  async sendTextMessage(toInternational: string, message: string): Promise<void> {
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

    await this.sendRequest(endpoint, body);
  }

  async sendTemplateMessage(
    toInternational: string,
    templateName: string,
    languageCode = 'en_US',
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

    await this.sendRequest(endpoint, body);
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

  private async sendRequest(endpoint: string, body: object): Promise<void> {
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
        `No se pudo enviar OTP por WhatsApp. Detalle: ${detail}`,
      );
    }
  }
}
