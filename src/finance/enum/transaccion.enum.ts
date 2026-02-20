export const TipoTransaccion = {
  INGRESO: 'INGRESO',
  EGRESO: 'EGRESO',
  TRANSFERENCIA: 'TRANSFERENCIA',
  AJUSTE: 'AJUSTE',
} as const;

export type TipoTransaccion =
  (typeof TipoTransaccion)[keyof typeof TipoTransaccion];

export type TipoTransaccionOperativa =
  | typeof TipoTransaccion.INGRESO
  | typeof TipoTransaccion.EGRESO;

export const OrigenTransaccion = {
  APERTURA: 'APERTURA',
  MANUAL: 'MANUAL',
  IMPORTACION: 'IMPORTACION',
} as const;

export type OrigenTransaccion =
  (typeof OrigenTransaccion)[keyof typeof OrigenTransaccion];

export type OrigenTransaccionOperativa =
  | typeof OrigenTransaccion.MANUAL
  | typeof OrigenTransaccion.IMPORTACION;
