import {
  CrearTransaccionBaseDto,
  CrearTransferenciaDto,
} from 'src/finance/dto/transaccion.dto';
import {
  TipoTransaccion,
  TipoTransaccionOperativa,
} from 'src/finance/enum/transaccion.enum';
import { Injectable } from '@nestjs/common';

export type ParsedWhatsappCommand =
  | { kind: 'HELP' }
  | {
      kind: 'MOVEMENT';
      tipo: TipoTransaccionOperativa;
      dto: CrearTransaccionBaseDto;
    }
  | { kind: 'TRANSFER'; dto: CrearTransferenciaDto };

@Injectable()
export class WhatsappCommandParserService {
  parseTextToCommand(text: string): ParsedWhatsappCommand | null {
    const cleaned = text
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/^([+\->])(?=\d)/, '$1 ');
    if (!cleaned) return null;

    const parts = cleaned.split(' ');
    const command = this.normalizeToken(parts[0]);
    if (!command) return null;

    if (
      ['ayuda', 'help', 'menu', 'formato', 'formatos', 'h'].includes(command)
    ) {
      return { kind: 'HELP' };
    }

    if (['ingreso', 'i', '+', 'in'].includes(command)) {
      return this.parseMovement(parts, TipoTransaccion.INGRESO);
    }

    if (['egreso', 'e', '-', 'gasto', 'out'].includes(command)) {
      return this.parseMovement(parts, TipoTransaccion.EGRESO);
    }

    if (['transferencia', 'transfer', 'transf', 't', '>'].includes(command)) {
      return this.parseTransfer(parts);
    }

    return null;
  }

  shouldSendQuickHelp(text: string): boolean {
    const normalized = this.normalizeToken((text ?? '').trim());
    if (!normalized) return false;

    return [
      'hola',
      'hello',
      'hi',
      'inicio',
      'start',
      'menu',
      'ayuda',
      'help',
    ].includes(normalized);
  }

  shouldCloseConversation(text: string): boolean {
    const normalized = this.normalizeToken((text ?? '').trim());
    return ['no', 'nop', 'listo', 'nada mas', 'terminar', 'fin'].includes(
      normalized,
    );
  }

  shouldContinueConversation(text: string): boolean {
    const normalized = this.normalizeToken((text ?? '').trim());
    return ['si', 's', 'ok', 'dale', 'continuar', 'otra'].includes(normalized);
  }

  private parseMovement(
    parts: string[],
    tipo: TipoTransaccionOperativa,
  ): ParsedWhatsappCommand | null {
    if (parts.length < 5) return null;

    const monto = this.parsePositiveAmount(parts[1]);
    const idCuenta = this.parsePositiveInt(parts[2]);
    const idCategoria = this.parsePositiveInt(parts[3]);
    const concepto = parts.slice(4).join(' ').trim();
    if (!monto || !idCuenta || !idCategoria || !concepto) return null;

    return {
      kind: 'MOVEMENT',
      tipo,
      dto: {
        monto,
        idCuenta,
        idCategoria,
        concepto,
      },
    };
  }

  private parseTransfer(parts: string[]): ParsedWhatsappCommand | null {
    if (parts.length < 5) return null;

    const monto = this.parsePositiveAmount(parts[1]);
    if (!monto) return null;

    let idCuentaOrigen: number | null = null;
    let idCuentaDestino: number | null = null;
    let conceptStart = 4;

    if (parts[2].includes('>')) {
      const [origen, destino] = parts[2].split('>');
      idCuentaOrigen = this.parsePositiveInt(origen);
      idCuentaDestino = this.parsePositiveInt(destino);
      conceptStart = 3;
    } else {
      idCuentaOrigen = this.parsePositiveInt(parts[2]);
      idCuentaDestino = this.parsePositiveInt(parts[3]);
    }

    const concepto = parts.slice(conceptStart).join(' ').trim();
    if (!idCuentaOrigen || !idCuentaDestino || !concepto) return null;

    return {
      kind: 'TRANSFER',
      dto: {
        monto,
        idCuentaOrigen,
        idCuentaDestino,
        concepto,
      },
    };
  }

  private parsePositiveAmount(raw: string): number | null {
    if (!raw) return null;
    const normalized = raw.replace(',', '.').replace(/[^0-9.\-]/g, '');
    if (!normalized) return null;
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return Number(parsed.toFixed(2));
  }

  private parsePositiveInt(raw: string): number | null {
    if (!raw) return null;
    const normalized = raw.replace(/[^\d]/g, '');
    if (!normalized) return null;
    const parsed = Number(normalized);
    if (!Number.isInteger(parsed) || parsed <= 0) return null;
    return parsed;
  }

  private normalizeToken(raw: string): string {
    return raw
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }
}
