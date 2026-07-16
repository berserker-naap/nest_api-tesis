export class BalanceAccountCuentaResumenDto {
  id!: number;
  alias!: string;
  saldoActual!: number;
  lineaCredito!: number | null;
  esTarjetaCredito!: boolean;
  diaCierre!: number | null;
  diaPago!: number | null;
  proximaFechaPago!: string | null;
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

export class BalanceAccountMesResumenDto {
  monedaCodigo!: string;
  monedaSimbolo!: string;
  periodoInicio!: string;
  periodoFin!: string;
  ingresos!: number;
  egresos!: number;
  balance!: number;
  porcentajeAhorro!: number | null;
  egresosMesAnterior!: number;
  variacionEgresosPorcentaje!: number | null;
}

export class BalanceAccountMovimientoRecienteDto {
  id!: number;
  idCuenta!: number;
  fecha!: Date;
  tipo!: string;
  monto!: number;
  concepto!: string;
  categoriaNombre!: string | null;
  cuentaAlias!: string;
  monedaCodigo!: string;
  monedaSimbolo!: string;
}

export class BalanceAccountAlertaDto {
  monedaCodigo!: string | null;
  tipo!: 'INFO' | 'WARNING' | 'DANGER';
  titulo!: string;
  mensaje!: string;
  icono!: string;
}

export class BalanceAccountResumenResponseDto {
  hasAccounts!: boolean;
  totalAccounts!: number;
  totalSaldoPen!: number;
  totalSaldoUsd!: number;
  totalDisponiblePen!: number;
  totalDisponibleUsd!: number;
  deudaTarjetaPen!: number;
  deudaTarjetaUsd!: number;
  cuentas!: BalanceAccountCuentaResumenDto[];
  saldoPorTipoCuenta!: BalanceAccountTipoCuentaResumenDto[];
  resumenTarjetaCreditoPorMoneda!: BalanceAccountTarjetaCreditoResumenDto[];
  resumenMesPorMoneda!: BalanceAccountMesResumenDto[];
  ultimasTransacciones!: BalanceAccountMovimientoRecienteDto[];
  alertas!: BalanceAccountAlertaDto[];
}
