export const NaturalezaTipoCuenta = {
  ACTIVO: 'ACTIVO',
  PASIVO: 'PASIVO',
} as const;

export type NaturalezaTipoCuenta =
  (typeof NaturalezaTipoCuenta)[keyof typeof NaturalezaTipoCuenta];
