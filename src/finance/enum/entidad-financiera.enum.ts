export const TipoEntidadFinanciera = {
  BANCO: 'BANCO',
  CAJA: 'CAJA',
  BILLETERA: 'BILLETERA',
} as const;

export type TipoEntidadFinanciera =
  (typeof TipoEntidadFinanciera)[keyof typeof TipoEntidadFinanciera];
