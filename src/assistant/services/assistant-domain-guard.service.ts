import { Injectable } from '@nestjs/common';

export interface DomainGuardResult {
  allowed: boolean;
  reason: string;
  safeReply: string;
  flags?: string[];
}

@Injectable()
export class AssistantDomainGuardService {
  private readonly financeKeywords = [
    'saldo',
    'cuenta',
    'cuentas',
    'gasto',
    'gastos',
    'egreso',
    'egresos',
    'ingreso',
    'ingresos',
    'transferencia',
    'transferencias',
    'deuda',
    'deudas',
    'credito',
    'presupuesto',
    'categoria',
    'categorias',
    'transaccion',
    'transacciones',
    'dolar',
    'soles',
    'tipo de cambio',
    'tarjeta',
    'linea de credito',
    'ahorro',
    'presamo',
    'cuota',
    'interes',
    'presupuesto',
    'meta de ahorro',
  ];

  private readonly blockedTopics = [
    'clima',
    'tiempo de hoy',
    'pronostico',
    'futbol',
    'pelicula',
    'series',
    'musica',
    'politica',
    'receta',
    'chiste',
  ];

  private readonly promptInjectionPatterns: RegExp[] = [
    /ignora (todas )?(las )?instrucciones/i,
    /actua como/i,
    /system prompt/i,
    /revela(r)? (tu )?prompt/i,
    /modo desarrollador/i,
    /bypass/i,
    /jailbreak/i,
  ];

  evaluate(rawInput: string): DomainGuardResult {
    const input = this.normalize(rawInput);
    if (!input) {
      return {
        allowed: false,
        reason: 'empty',
        safeReply:
          'Escribe una pregunta relacionada con tus finanzas personales para poder ayudarte.',
      };
    }

    const flags: string[] = [];

    if (this.promptInjectionPatterns.some((pattern) => pattern.test(input))) {
      return {
        allowed: false,
        reason: 'prompt_injection',
        safeReply:
          'No puedo cambiar mis reglas internas. Puedo ayudarte con analisis de tus finanzas personales.',
      };
    }

    const blockedHits = this.blockedTopics.filter((term) => input.includes(term));
    if (blockedHits.length > 0) {
      return {
        allowed: false,
        reason: 'blocked_topic',
        safeReply:
          'Solo puedo ayudarte con temas financieros de tu cuenta: saldos, transacciones, categorias, transferencias y recomendaciones.',
        flags: blockedHits,
      };
    }

    const financeHits = this.financeKeywords.filter((term) => input.includes(term));
    const hasMoneySignals =
      input.includes('s/') ||
      input.includes('$') ||
      input.includes('pen') ||
      input.includes('usd');

    if (financeHits.length > 0) {
      flags.push(...financeHits);
    }
    if (hasMoneySignals) {
      flags.push('money_signal');
    }

    if (financeHits.length === 0 && !hasMoneySignals) {
      return {
        allowed: false,
        reason: 'out_of_domain',
        safeReply:
          'Estoy especializado en finanzas personales. Preguntame por tus gastos, ingresos, cuentas, deudas o presupuesto.',
        flags,
      };
    }

    return {
      allowed: true,
      reason: 'ok',
      safeReply: '',
      flags,
    };
  }

  private normalize(value: string): string {
    return (value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}
