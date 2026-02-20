export const TipoCategoriaFinance = {
  INGRESO: 'INGRESO',
  EGRESO: 'EGRESO',
} as const;

export type TipoCategoriaFinance =
  (typeof TipoCategoriaFinance)[keyof typeof TipoCategoriaFinance];
