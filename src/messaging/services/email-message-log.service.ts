import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailMessageLog } from '../entities/email-message-log.entity';

export type EmailMessageLogInput = {
  status: string;
  provider: string;
  senderAddress: string;
  recipients: string[];
  subject: string;
  templateCode?: string | null;
  providerMessageId?: string | null;
  idUsuario?: number | null;
  usuarioLogin?: string | null;
  detail?: string | null;
  payload?: unknown;
  ip?: string | null;
};

@Injectable()
export class EmailMessageLogService {
  constructor(
    @InjectRepository(EmailMessageLog)
    private readonly logRepository: Repository<EmailMessageLog>,
  ) {}

  async logOutgoing(input: EmailMessageLogInput): Promise<void> {
    try {
      const senderAddress = this.toNullableString(input.senderAddress, 320);
      const subject = this.toNullableString(input.subject, 255);
      const recipientsSummary = this.toNullableString(
        input.recipients.join('; '),
        1500,
      );

      if (!senderAddress || !subject || !recipientsSummary) {
        return;
      }

      const entity = this.logRepository.create({
        status: this.toNullableString(input.status, 30) ?? 'UNKNOWN',
        provider: this.toNullableString(input.provider, 60) ?? 'UNKNOWN',
        senderAddress,
        recipientsSummary,
        subject,
        templateCode: this.toNullableString(input.templateCode, 60),
        providerMessageId: this.toNullableString(input.providerMessageId, 200),
        idUsuario:
          typeof input.idUsuario === 'number' && Number.isFinite(input.idUsuario)
            ? input.idUsuario
            : null,
        usuarioLogin: this.toNullableString(input.usuarioLogin, 100),
        detail: this.toNullableString(input.detail, 500),
        payloadJson: this.toPayloadJson(input.payload, 3500),
        activo: true,
        eliminado: false,
        ipRegistro: this.toNullableString(input.ip, 50) ?? undefined,
        usuarioRegistro: this.toNullableString(input.usuarioLogin, 100) ?? 'system',
      });

      await this.logRepository.save(entity);
    } catch (error) {
      console.error('Error registrando bitacora Email:', error);
    }
  }

  private toPayloadJson(payload: unknown, maxLength: number): string | null {
    if (payload === undefined || payload === null) {
      return null;
    }
    try {
      return this.toNullableString(JSON.stringify(payload), maxLength);
    } catch {
      return this.toNullableString(String(payload), maxLength);
    }
  }

  private toNullableString(value: unknown, maxLength: number): string | null {
    if (value === undefined || value === null) {
      return null;
    }
    const text = String(value).trim();
    if (!text) {
      return null;
    }
    return text.length > maxLength ? text.slice(0, maxLength) : text;
  }
}

