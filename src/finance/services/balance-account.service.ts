import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StatusResponse } from 'src/common/dto/response.dto';
import { Repository } from 'typeorm';
import {
  BalanceAccountAlertaDto,
  BalanceAccountCuentaResumenDto,
  BalanceAccountMesResumenDto,
  BalanceAccountMovimientoRecienteDto,
  BalanceAccountResumenResponseDto,
  BalanceAccountTarjetaCreditoResumenDto,
  BalanceAccountTipoCuentaResumenDto,
} from '../dto/balance-account.dto';
import { Cuenta } from '../entities/cuenta.entity';
import { Transaccion } from '../entities/transaccion.entity';
import { TipoTransaccion } from '../enum/transaccion.enum';

@Injectable()
export class BalanceAccountService {
  constructor(
    @InjectRepository(Cuenta)
    private readonly cuentaRepository: Repository<Cuenta>,
    @InjectRepository(Transaccion)
    private readonly transaccionRepository: Repository<Transaccion>,
  ) {}

  private isTipoCuentaTarjetaCredito(nombreTipoCuenta: string): boolean {
    const normalized = (nombreTipoCuenta ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .trim();
    return normalized.includes('TARJETA') && normalized.includes('CREDITO');
  }

  async getResumen(
    idUsuario: number,
  ): Promise<StatusResponse<BalanceAccountResumenResponseDto | any>> {
    try {
      const cuentas = await this.cuentaRepository.find({
        where: {
          usuario: { id: idUsuario },
          activo: true,
          eliminado: false,
        },
        relations: ['moneda', 'tipoCuenta', 'entidadFinanciera'],
        order: { id: 'DESC' },
      });

      const cuentasResumen: BalanceAccountCuentaResumenDto[] = cuentas.map(
        (cuenta) => ({
          id: cuenta.id,
          alias: cuenta.alias,
          saldoActual: Number(cuenta.saldoActual),
          lineaCredito:
            cuenta.lineaCredito !== null && cuenta.lineaCredito !== undefined
              ? Number(cuenta.lineaCredito)
              : null,
          esTarjetaCredito: this.isTipoCuentaTarjetaCredito(
            cuenta.tipoCuenta.nombre,
          ),
          diaCierre: cuenta.diaCierre ?? null,
          diaPago: cuenta.diaPago ?? null,
          proximaFechaPago: this.getNextDayOfMonth(cuenta.diaPago),
          monedaCodigo: cuenta.moneda.codigo,
          monedaSimbolo: cuenta.moneda.simbolo,
          tipoCuenta: cuenta.tipoCuenta.nombre,
          entidadFinanciera: cuenta.entidadFinanciera?.nombre ?? null,
          entidadFinancieraIconoUrl: cuenta.entidadFinanciera?.iconoUrl ?? null,
        }),
      );

      const saldoPorTipoCuentaMap = new Map<string, BalanceAccountTipoCuentaResumenDto>();
      for (const cuenta of cuentasResumen) {
        const key = `${cuenta.tipoCuenta}|${cuenta.monedaCodigo}`;
        const current = saldoPorTipoCuentaMap.get(key);
        if (current) {
          current.cantidad += 1;
          current.saldoTotal = Number((current.saldoTotal + cuenta.saldoActual).toFixed(2));
        } else {
          saldoPorTipoCuentaMap.set(key, {
            tipoCuenta: cuenta.tipoCuenta,
            monedaCodigo: cuenta.monedaCodigo,
            monedaSimbolo: cuenta.monedaSimbolo,
            cantidad: 1,
            saldoTotal: Number(cuenta.saldoActual.toFixed(2)),
          });
        }
      }

      const totalSaldoPen = cuentasResumen
        .filter((cuenta) => cuenta.monedaCodigo === 'PEN')
        .reduce((acc, item) => acc + item.saldoActual, 0);

      const totalSaldoUsd = cuentasResumen
        .filter((cuenta) => cuenta.monedaCodigo === 'USD')
        .reduce((acc, item) => acc + item.saldoActual, 0);

      const totalDisponiblePen = cuentasResumen
        .filter((cuenta) => cuenta.monedaCodigo === 'PEN' && !cuenta.esTarjetaCredito)
        .reduce((acc, item) => acc + item.saldoActual, 0);

      const totalDisponibleUsd = cuentasResumen
        .filter((cuenta) => cuenta.monedaCodigo === 'USD' && !cuenta.esTarjetaCredito)
        .reduce((acc, item) => acc + item.saldoActual, 0);

      const tarjetaResumenMap = new Map<
        string,
        BalanceAccountTarjetaCreditoResumenDto
      >();
      for (const cuenta of cuentasResumen) {
        if (!cuenta.esTarjetaCredito || !cuenta.lineaCredito) {
          continue;
        }

        const key = cuenta.monedaCodigo;
        const current = tarjetaResumenMap.get(key);
        const linea = Number(cuenta.lineaCredito);
        const disponible = Number(cuenta.saldoActual);
        const consumido = Number(Math.max(linea - disponible, 0).toFixed(2));

        if (current) {
          current.cantidadTarjetas += 1;
          current.lineaCredito = Number((current.lineaCredito + linea).toFixed(2));
          current.disponible = Number((current.disponible + disponible).toFixed(2));
          current.consumido = Number((current.consumido + consumido).toFixed(2));
        } else {
          tarjetaResumenMap.set(key, {
            monedaCodigo: cuenta.monedaCodigo,
            monedaSimbolo: cuenta.monedaSimbolo,
            cantidadTarjetas: 1,
            lineaCredito: Number(linea.toFixed(2)),
            disponible: Number(disponible.toFixed(2)),
            consumido,
          });
        }
      }

      const tarjetasResumen = Array.from(tarjetaResumenMap.values()).sort(
        (a, b) => b.consumido - a.consumido,
      );
      const deudaTarjetaPen = tarjetasResumen
        .filter((item) => item.monedaCodigo === 'PEN')
        .reduce((acc, item) => acc + item.consumido, 0);
      const deudaTarjetaUsd = tarjetasResumen
        .filter((item) => item.monedaCodigo === 'USD')
        .reduce((acc, item) => acc + item.consumido, 0);

      const { resumenMesPorMoneda, ultimasTransacciones } =
        await this.getActividadPrincipal(idUsuario);
      const alertas = this.buildAlertas(resumenMesPorMoneda, tarjetasResumen);

      return new StatusResponse(true, 200, 'Resumen de balance account obtenido', {
        hasAccounts: cuentasResumen.length > 0,
        totalAccounts: cuentasResumen.length,
        totalSaldoPen: Number(totalSaldoPen.toFixed(2)),
        totalSaldoUsd: Number(totalSaldoUsd.toFixed(2)),
        totalDisponiblePen: Number(totalDisponiblePen.toFixed(2)),
        totalDisponibleUsd: Number(totalDisponibleUsd.toFixed(2)),
        deudaTarjetaPen: Number(deudaTarjetaPen.toFixed(2)),
        deudaTarjetaUsd: Number(deudaTarjetaUsd.toFixed(2)),
        cuentas: cuentasResumen,
        saldoPorTipoCuenta: Array.from(saldoPorTipoCuentaMap.values()).sort(
          (a, b) => b.saldoTotal - a.saldoTotal,
        ),
        resumenTarjetaCreditoPorMoneda: tarjetasResumen,
        resumenMesPorMoneda,
        ultimasTransacciones,
        alertas,
      });
    } catch (error) {
      console.error('Error al obtener resumen de balance account:', error);
      return new StatusResponse(
        false,
        500,
        'Error al obtener resumen de balance account',
        error,
      );
    }
  }

  private async getActividadPrincipal(idUsuario: number): Promise<{
    resumenMesPorMoneda: BalanceAccountMesResumenDto[];
    ultimasTransacciones: BalanceAccountMovimientoRecienteDto[];
  }> {
    const now = new Date();
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
    const inicioMesSiguiente = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const inicioMesAnterior = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const actividad = await this.transaccionRepository
      .createQueryBuilder('transaccion')
      .innerJoinAndSelect('transaccion.cuenta', 'cuenta')
      .innerJoinAndSelect('cuenta.moneda', 'moneda')
      .leftJoinAndSelect('transaccion.categoria', 'categoria')
      .where('transaccion.idUsuario = :idUsuario', { idUsuario })
      .andWhere('transaccion.fecha >= :inicioMesAnterior', { inicioMesAnterior })
      .andWhere('transaccion.fecha < :inicioMesSiguiente', { inicioMesSiguiente })
      .andWhere('transaccion.activo = :activo', { activo: true })
      .andWhere('transaccion.eliminado = :eliminado', { eliminado: false })
      .andWhere('transaccion.idCategoria IS NOT NULL')
      .getMany();

    const totals = new Map<string, {
      monedaCodigo: string;
      monedaSimbolo: string;
      ingresos: number;
      egresos: number;
      egresosMesAnterior: number;
    }>();
    for (const item of actividad) {
      const fecha = new Date(item.fecha);
      const monto = Number(item.monto || 0);
      const monedaCodigo = item.cuenta.moneda.codigo;
      const current = totals.get(monedaCodigo) ?? {
        monedaCodigo,
        monedaSimbolo: item.cuenta.moneda.simbolo,
        ingresos: 0,
        egresos: 0,
        egresosMesAnterior: 0,
      };
      if (fecha >= inicioMes) {
        if (item.tipo === TipoTransaccion.INGRESO) {
          current.ingresos += monto;
        } else if (item.tipo === TipoTransaccion.EGRESO) {
          current.egresos += monto;
        }
      } else if (item.tipo === TipoTransaccion.EGRESO) {
        current.egresosMesAnterior += monto;
      }
      totals.set(monedaCodigo, current);
    }

    for (const code of ['PEN', 'USD']) {
      if (!totals.has(code)) {
        totals.set(code, {
          monedaCodigo: code,
          monedaSimbolo: code === 'PEN' ? 'S/' : '$',
          ingresos: 0,
          egresos: 0,
          egresosMesAnterior: 0,
        });
      }
    }

    const recientes = await this.transaccionRepository
      .createQueryBuilder('transaccion')
      .innerJoinAndSelect('transaccion.cuenta', 'cuenta')
      .innerJoinAndSelect('cuenta.moneda', 'moneda')
      .leftJoinAndSelect('transaccion.categoria', 'categoria')
      .where('transaccion.idUsuario = :idUsuario', { idUsuario })
      .andWhere('transaccion.activo = :activo', { activo: true })
      .andWhere('transaccion.eliminado = :eliminado', { eliminado: false })
      .orderBy('transaccion.fecha', 'DESC')
      .addOrderBy('transaccion.id', 'DESC')
      .take(8)
      .getMany();

    const recientesVisibles = recientes
      .filter((item) => {
        const description = (item.descripcion ?? '').toLowerCase();
        return !description.startsWith('transferencia desde')
          && !description.startsWith('pago recibido desde');
      })
      .slice(0, 3);

    return {
      resumenMesPorMoneda: Array.from(totals.values()).map((item) => {
        const balance = item.ingresos - item.egresos;
        return {
          monedaCodigo: item.monedaCodigo,
          monedaSimbolo: item.monedaSimbolo,
          periodoInicio: this.toDateOnly(inicioMes),
          periodoFin: this.toDateOnly(new Date(inicioMesSiguiente.getTime() - 1)),
          ingresos: Number(item.ingresos.toFixed(2)),
          egresos: Number(item.egresos.toFixed(2)),
          balance: Number(balance.toFixed(2)),
          porcentajeAhorro: item.ingresos > 0
            ? Number(((balance / item.ingresos) * 100).toFixed(1))
            : null,
          egresosMesAnterior: Number(item.egresosMesAnterior.toFixed(2)),
          variacionEgresosPorcentaje: item.egresosMesAnterior > 0
            ? Number((((item.egresos - item.egresosMesAnterior) / item.egresosMesAnterior) * 100).toFixed(1))
            : null,
        };
      }),
      ultimasTransacciones: recientesVisibles.map((item) => ({
        id: item.id,
        idCuenta: item.cuenta.id,
        fecha: item.fecha,
        tipo: item.tipo,
        monto: Number(item.monto),
        concepto: item.concepto,
        categoriaNombre: item.categoria?.nombre ?? null,
        cuentaAlias: item.cuenta.alias,
        monedaCodigo: item.cuenta.moneda.codigo,
        monedaSimbolo: item.cuenta.moneda.simbolo,
      })),
    };
  }

  private buildAlertas(
    resumenes: BalanceAccountMesResumenDto[],
    tarjetas: BalanceAccountTarjetaCreditoResumenDto[],
  ): BalanceAccountAlertaDto[] {
    const alertas: BalanceAccountAlertaDto[] = [];

    for (const resumen of resumenes) {
      if (resumen.balance < 0) {
        alertas.push({
          monedaCodigo: resumen.monedaCodigo,
          tipo: 'DANGER',
          titulo: `Gastos por encima de tus ingresos en ${resumen.monedaCodigo}`,
          mensaje: `Tu balance del mes es ${resumen.monedaSimbolo}${resumen.balance.toFixed(2)}. Revisa tus egresos recientes.`,
          icono: 'alert-circle-outline',
        });
      } else if (
        resumen.variacionEgresosPorcentaje !== null &&
        resumen.variacionEgresosPorcentaje >= 15
      ) {
        alertas.push({
          monedaCodigo: resumen.monedaCodigo,
          tipo: 'WARNING',
          titulo: `Tus gastos aumentaron en ${resumen.monedaCodigo}`,
          mensaje: `Gastaste ${resumen.variacionEgresosPorcentaje.toFixed(0)}% mas que el mes anterior.`,
          icono: 'trending-up-outline',
        });
      }
    }

    for (const tarjeta of tarjetas) {
      const uso = tarjeta.lineaCredito > 0
        ? (tarjeta.consumido / tarjeta.lineaCredito) * 100
        : 0;
      if (uso >= 80) {
        alertas.push({
          monedaCodigo: tarjeta.monedaCodigo,
          tipo: uso >= 95 ? 'DANGER' : 'WARNING',
          titulo: 'Uso elevado de tarjeta',
          mensaje: `Has utilizado ${uso.toFixed(0)}% de tu linea en ${tarjeta.monedaCodigo}.`,
          icono: 'card-outline',
        });
      }
    }

    if (alertas.length === 0 && resumenes.some((item) => item.ingresos > 0 || item.egresos > 0)) {
      alertas.push({
        monedaCodigo: null,
        tipo: 'INFO',
        titulo: 'Tus finanzas estan al dia',
        mensaje: 'No detectamos alertas importantes en el periodo actual.',
        icono: 'checkmark-circle-outline',
      });
    }

    return alertas.slice(0, 3);
  }

  private toDateOnly(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private getNextDayOfMonth(day: number | null | undefined): string | null {
    if (!day) return null;
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth();
    let lastDay = new Date(year, month + 1, 0).getDate();
    let candidate = new Date(year, month, Math.min(day, lastDay));
    const today = new Date(year, month, now.getDate());
    if (candidate < today) {
      month += 1;
      if (month > 11) {
        month = 0;
        year += 1;
      }
      lastDay = new Date(year, month + 1, 0).getDate();
      candidate = new Date(year, month, Math.min(day, lastDay));
    }
    return this.toDateOnly(candidate);
  }
}
