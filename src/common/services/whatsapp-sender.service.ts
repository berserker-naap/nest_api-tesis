import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhatsappSenderService {
  constructor(private readonly configService: ConfigService) {}

  async sendOtp(toE164: string, code: string): Promise<void> {
    const accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID');
    const apiVersion = this.configService.get<string>('WHATSAPP_API_VERSION') ?? 'v22.0';
    const otpMessagePrefix =
      this.configService.get<string>('WHATSAPP_OTP_MESSAGE_PREFIX') ??
      'Tu codigo de verificacion es';

    if (!accessToken || !phoneNumberId) {
      throw new InternalServerErrorException(
        'Falta configuracion WhatsApp (WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID)',
      );
    }

    const endpoint = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
    const cleanTo = toE164.replace('+', '');
    const body = {
      messaging_product: 'whatsapp',
      to: cleanTo,
      type: 'text',
      text: {
        body: `${otpMessagePrefix}: ${code}`,
      },
    };

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
