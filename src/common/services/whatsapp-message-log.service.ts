import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsappMessageLog } from '../../security/entities/whatsapp-message-log.entity';

type WhatsappDirection = 'IN' | 'OUT';

export type WhatsappMessageLogInput = {
  direction: WhatsappDirection;
  status: string;
  phone: string;
  providerMessageId?: string | null;
  idUsuario?: number | null;
  usuarioLogin?: string | null;
  idTransaccion?: number | null;
  text?: string | null;
  detail?: string | null;
  payload?: unknown;
  ip?: string | null;
};

@Injectable()
export class WhatsappMessageLogService {
  constructor(
    @InjectRepository(WhatsappMessageLog)
    private readonly logRepository: Repository<WhatsappMessageLog>,
  ) {}

  async existsIncomingMessage(providerMessageId?: string | null): Promise<boolean> {
    const id = this.toNullableString(providerMessageId, 150);
    if (!id) {
      return false;
    }

    const existing = await this.logRepository.findOne({
      where: {
        direction: 'IN',
        providerMessageId: id,
      },
      select: { id: true },
    });
    return Boolean(existing);
  }

  async isIncomingSessionExpired(
    phone: string,
    inactivityMinutes: number,
  ): Promise<boolean> {
    const sanitizedPhone = this.toNullableString(phone, 25);
    if (!sanitizedPhone) {
      return false;
    }

    const minutes = Number.isFinite(inactivityMinutes)
      ? Math.max(1, Math.floor(inactivityMinutes))
      : 60;
    const thresholdMs = minutes * 60 * 1000;

    const lastIncoming = await this.logRepository.findOne({
      where: {
        direction: 'IN',
        phone: sanitizedPhone,
      },
      order: {
        fechaRegistro: 'DESC',
        id: 'DESC',
      },
      select: {
        id: true,
        fechaRegistro: true,
      },
    });

    if (!lastIncoming?.fechaRegistro) {
      return true;
    }

    const elapsed = Date.now() - lastIncoming.fechaRegistro.getTime();
    return elapsed >= thresholdMs;
  }

  async logIncoming(input: Omit<WhatsappMessageLogInput, 'direction'>): Promise<void> {
    await this.log({
      ...input,
      direction: 'IN',
    });
  }

  async logOutgoing(input: Omit<WhatsappMessageLogInput, 'direction'>): Promise<void> {
    await this.log({
      ...input,
      direction: 'OUT',
    });
  }

  private async log(input: WhatsappMessageLogInput): Promise<void> {
    try {
      const phone = this.toNullableString(input.phone, 25);
      if (!phone) {
        return;
      }

      const entity = this.logRepository.create({
        direction: input.direction,
        status: this.toNullableString(input.status, 30) ?? 'UNKNOWN',
        phone,
        providerMessageId: this.toNullableString(input.providerMessageId, 150),
        idUsuario:
          typeof input.idUsuario === 'number' && Number.isFinite(input.idUsuario)
            ? input.idUsuario
            : null,
        usuarioLogin: this.toNullableString(input.usuarioLogin, 100),
        idTransaccion:
          typeof input.idTransaccion === 'number' &&
          Number.isFinite(input.idTransaccion)
            ? input.idTransaccion
            : null,
        text: this.toNullableString(input.text, 1400),
        detail: this.toNullableString(input.detail, 500),
        payloadJson: this.toPayloadJson(input.payload, 3500),
        activo: true,
        eliminado: false,
        ipRegistro: this.toNullableString(input.ip, 50) ?? undefined,
        usuarioRegistro: this.toNullableString(input.usuarioLogin, 100) ?? 'system',
      });

      await this.logRepository.save(entity);
    } catch (error) {
      console.error('Error registrando bitacora WhatsApp:', error);
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
