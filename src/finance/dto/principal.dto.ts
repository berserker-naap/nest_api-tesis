export class PrincipalCuentaResumenDto {
  id!: number;
  alias!: string;
  saldoActual!: number;
  monedaCodigo!: string;
  monedaSimbolo!: string;
  tipoCuenta!: string;
  entidadFinanciera!: string | null;
}

export class PrincipalTipoCuentaResumenDto {
  tipoCuenta!: string;
  monedaCodigo!: string;
  monedaSimbolo!: string;
  cantidad!: number;
  saldoTotal!: number;
}

export class PrincipalResumenResponseDto {
  hasAccounts!: boolean;
  totalAccounts!: number;
  totalSaldoPen!: number;
  totalSaldoUsd!: number;
  cuentas!: PrincipalCuentaResumenDto[];
  saldoPorTipoCuenta!: PrincipalTipoCuentaResumenDto[];
}
