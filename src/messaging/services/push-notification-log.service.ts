import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PushNotificationLog } from '../entities/push-notification-log.entity';

export type PushNotificationLogInput = {
  status: string;
  provider: string;
  platform: string;
  format: string;
  targetExpression: string;
  title?: string | null;
  messagePreview?: string | null;
  providerMessageId?: string | null;
  idUsuario?: number | null;
  usuarioLogin?: string | null;
  detail?: string | null;
  payload?: unknown;
  ip?: string | null;
};

@Injectable()
export class PushNotificationLogService {
  constructor(
    @InjectRepository(PushNotificationLog)
    private readonly logRepository: Repository<PushNotificationLog>,
  ) {}

  async logOutgoing(input: PushNotificationLogInput): Promise<void> {
    try {
      const entity = this.logRepository.create({
        status: this.toNullableString(input.status, 30) ?? 'UNKNOWN',
        provider: this.toNullableString(input.provider, 60) ?? 'UNKNOWN',
        platform: this.toNullableString(input.platform, 20) ?? 'UNKNOWN',
        format: this.toNullableString(input.format, 30) ?? 'UNKNOWN',
        targetExpression:
          this.toNullableString(input.targetExpression, 500) ?? 'UNSPECIFIED',
        title: this.toNullableString(input.title, 120),
        messagePreview: this.toNullableString(input.messagePreview, 500),
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
      console.error('Error registrando bitacora Push:', error);
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

