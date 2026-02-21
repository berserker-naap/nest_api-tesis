import { Injectable } from '@nestjs/common';

type MovementPayload = {
  idTransaccion?: number;
  monto?: number;
  saldoActual?: number;
  tipo?: string;
};

type TransferPayload = {
  idTransaccionSalida?: number;
  idTransaccionEntrada?: number;
  monto?: number;
  idCuentaOrigen?: number;
  idCuentaDestino?: number;
};

@Injectable()
export class WhatsappMessageComposerService {
  buildNotAssociated(): string {
    return 'Debes asociar tu numero a tu cuenta desde la app para continuar.';
  }

  buildPendingOtp(plainCode: string): string {
    return `Este es tu codigo: ${plainCode}. Verificalo desde tu cuenta en la app para continuar.`;
  }

  buildQuickHelp(login: string): string {
    return `${this.buildWelcome(login)} ${this.buildUsage()}`;
  }

  buildUnknownFormat(login: string): string {
    return `${this.buildWelcome(login)} No entendi el formato. ${this.buildUsage()}`;
  }

  buildSessionWelcome(login: string): string {
    return `Hola ${login}. Bienvenido de nuevo. ${this.buildUsage()}`;
  }

  buildCloseAcknowledgement(login: string): string {
    return `Perfecto ${login}, gracias. Te esperamos luego.`;
  }

  buildContinuePrompt(login: string): string {
    return `${this.buildWelcome(login)} Genial, enviame la siguiente transaccion. ${this.buildUsage()}`;
  }

  buildMovementError(login: string, message: string | string[]): string {
    return `${this.buildWelcome(login)} No pude registrar el movimiento. ${this.safeMessage(message)}`;
  }

  buildTransferError(login: string, message: string | string[]): string {
    return `${this.buildWelcome(login)} No pude registrar la transferencia. ${this.safeMessage(message)}`;
  }

  buildMovementSuccess(
    login: string,
    message: string | string[],
    payload: MovementPayload,
  ): string {
    return `${this.buildWelcome(login)} ${this.safeMessage(message)}. ${
      payload.idTransaccion ? `ID ${payload.idTransaccion}. ` : ''
    }${payload.tipo ? `Tipo ${payload.tipo}. ` : ''}${
      typeof payload.monto === 'number'
        ? `Monto ${this.formatAmount(payload.monto)}. `
        : ''
    }${
      typeof payload.saldoActual === 'number'
        ? `Saldo ${this.formatAmount(payload.saldoActual)}.`
        : ''
    } ${this.buildAddMorePrompt()}`.trim();
  }

  buildTransferSuccess(login: string, payload: TransferPayload): string {
    return `${this.buildWelcome(login)} Transferencia registrada. ${
      payload.idTransaccionSalida
        ? `Salida ID ${payload.idTransaccionSalida}. `
        : ''
    }${
      payload.idTransaccionEntrada
        ? `Entrada ID ${payload.idTransaccionEntrada}. `
        : ''
    }${
      typeof payload.monto === 'number'
        ? `Monto ${this.formatAmount(payload.monto)}. `
        : ''
    }${
      payload.idCuentaOrigen && payload.idCuentaDestino
        ? `Cuenta ${payload.idCuentaOrigen} -> ${payload.idCuentaDestino}.`
        : ''
    } ${this.buildAddMorePrompt()}`.trim();
  }

  buildInactivityClose(login: string): string {
    return `Gracias ${login}, te esperamos luego.`;
  }

  private buildWelcome(login: string): string {
    return `Hola ${login}.`;
  }

  private buildUsage(): string {
    return 'Formato rapido: + monto cuenta categoria concepto | - monto cuenta categoria concepto | t monto cuentaOrigen cuentaDestino concepto. Ej: - 25.5 1 5 taxi';
  }

  private buildAddMorePrompt(): string {
    return 'Registrada con exito. Deseas agregar una mas? Responde con otra transaccion o escribe NO.';
  }

  private formatAmount(value: number): string {
    return `S/${Number(value).toFixed(2)}`;
  }

  private safeMessage(message: string | string[]): string {
    return Array.isArray(message)
      ? message.filter(Boolean).join(' | ')
      : String(message ?? '').trim();
  }
}

