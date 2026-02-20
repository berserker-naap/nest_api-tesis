import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StatusResponse } from 'src/common/dto/response.dto';
import { Repository } from 'typeorm';
import {
  BalanceAccountCuentaResumenDto,
  BalanceAccountResumenResponseDto,
  BalanceAccountTarjetaCreditoResumenDto,
  BalanceAccountTipoCuentaResumenDto,
} from '../dto/balance-account.dto';
import { Cuenta } from '../entities/cuenta.entity';

@Injectable()
export class BalanceAccountService {
  constructor(
    @InjectRepository(Cuenta)
    private readonly cuentaRepository: Repository<Cuenta>,
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

      return new StatusResponse(true, 200, 'Resumen de balance account obtenido', {
        hasAccounts: cuentasResumen.length > 0,
        totalAccounts: cuentasResumen.length,
        totalSaldoPen: Number(totalSaldoPen.toFixed(2)),
        totalSaldoUsd: Number(totalSaldoUsd.toFixed(2)),
        cuentas: cuentasResumen,
        saldoPorTipoCuenta: Array.from(saldoPorTipoCuentaMap.values()).sort(
          (a, b) => b.saldoTotal - a.saldoTotal,
        ),
        resumenTarjetaCreditoPorMoneda: Array.from(
          tarjetaResumenMap.values(),
        ).sort((a, b) => b.consumido - a.consumido),
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
}
