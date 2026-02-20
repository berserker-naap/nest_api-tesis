export class BalanceAccountCuentaResumenDto {
  id!: number;
  alias!: string;
  saldoActual!: number;
  lineaCredito!: number | null;
  esTarjetaCredito!: boolean;
  monedaCodigo!: string;
  monedaSimbolo!: string;
  tipoCuenta!: string;
  entidadFinanciera!: string | null;
  entidadFinancieraIconoUrl!: string | null;
}

export class BalanceAccountTipoCuentaResumenDto {
  tipoCuenta!: string;
  monedaCodigo!: string;
  monedaSimbolo!: string;
  cantidad!: number;
  saldoTotal!: number;
}

export class BalanceAccountTarjetaCreditoResumenDto {
  monedaCodigo!: string;
  monedaSimbolo!: string;
  cantidadTarjetas!: number;
  consumido!: number;
  lineaCredito!: number;
  disponible!: number;
}

export class BalanceAccountResumenResponseDto {
  hasAccounts!: boolean;
  totalAccounts!: number;
  totalSaldoPen!: number;
  totalSaldoUsd!: number;
  cuentas!: BalanceAccountCuentaResumenDto[];
  saldoPorTipoCuenta!: BalanceAccountTipoCuentaResumenDto[];
  resumenTarjetaCreditoPorMoneda!: BalanceAccountTarjetaCreditoResumenDto[];
}
