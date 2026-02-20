export class BalanceAccountCuentaResumenDto {
  id!: number;
  alias!: string;
  saldoActual!: number;
  monedaCodigo!: string;
  monedaSimbolo!: string;
  tipoCuenta!: string;
  entidadFinanciera!: string | null;
}

export class BalanceAccountTipoCuentaResumenDto {
  tipoCuenta!: string;
  monedaCodigo!: string;
  monedaSimbolo!: string;
  cantidad!: number;
  saldoTotal!: number;
}

export class BalanceAccountResumenResponseDto {
  hasAccounts!: boolean;
  totalAccounts!: number;
  totalSaldoPen!: number;
  totalSaldoUsd!: number;
  cuentas!: BalanceAccountCuentaResumenDto[];
  saldoPorTipoCuenta!: BalanceAccountTipoCuentaResumenDto[];
}
