import {
  OrigenTransaccion,
  TipoTransaccion,
} from '../../finance/enum/transaccion.enum';

export const ANALYTICS_OTHER_CATEGORY = 'OTROS';

type AnalyticsTransactionCandidate = {
  tipo: string;
  origen: string;
  monto: number | string;
  concepto?: string | null;
  descripcion?: string | null;
  categoria?: { id?: number; nombre?: string } | null;
};

const INTERNAL_ORIGINS = new Set<string>([
  OrigenTransaccion.APERTURA,
  OrigenTransaccion.TRANSFERENCIA,
  OrigenTransaccion.PAGO_TARJETA,
]);

export function isAnalyticsExpense(
  transaction: AnalyticsTransactionCandidate,
): boolean {
  return (
    transaction.tipo === TipoTransaccion.EGRESO &&
    Number(transaction.monto) > 0 &&
    !isInternalMovement(transaction)
  );
}

export function analyticsCategoryName(
  categoryName?: string | null,
): string {
  return categoryName?.trim() || ANALYTICS_OTHER_CATEGORY;
}

function isInternalMovement(
  transaction: AnalyticsTransactionCandidate,
): boolean {
  const origin = normalize(transaction.origen);
  if (INTERNAL_ORIGINS.has(origin)) {
    return true;
  }

  if (transaction.categoria?.id) {
    return false;
  }

  const concept = normalize(transaction.concepto);
  const description = normalize(transaction.descripcion);
  return (
    concept.startsWith('PAGO DE TARJETA') ||
    description.startsWith('PAGO ENVIADO A') ||
    description.startsWith('PAGO RECIBIDO DESDE') ||
    description.startsWith('TRANSFERENCIA A') ||
    description.startsWith('TRANSFERENCIA DESDE')
  );
}

function normalize(value?: string | null): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}
