import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StatusResponse } from 'src/common/dto/response.dto';
import { Repository } from 'typeorm';
import {
  PrincipalCuentaResumenDto,
  PrincipalResumenResponseDto,
  PrincipalTipoCuentaResumenDto,
} from '../dto/principal.dto';
import { Cuenta } from '../entities/cuenta.entity';

@Injectable()
export class PrincipalFinanceService {
  constructor(
    @InjectRepository(Cuenta)
    private readonly cuentaRepository: Repository<Cuenta>,
  ) {}

  async getResumen(idUsuario: number): Promise<StatusResponse<PrincipalResumenResponseDto | any>> {
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

      const cuentasResumen: PrincipalCuentaResumenDto[] = cuentas.map((cuenta) => ({
        id: cuenta.id,
        alias: cuenta.alias,
        saldoActual: Number(cuenta.saldoActual),
        monedaCodigo: cuenta.moneda.codigo,
        monedaSimbolo: cuenta.moneda.simbolo,
        tipoCuenta: cuenta.tipoCuenta.nombre,
        entidadFinanciera: cuenta.entidadFinanciera?.nombre ?? null,
      }));

      const saldoPorTipoCuentaMap = new Map<string, PrincipalTipoCuentaResumenDto>();
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

      return new StatusResponse(true, 200, 'Resumen principal obtenido', {
        hasAccounts: cuentasResumen.length > 0,
        totalAccounts: cuentasResumen.length,
        totalSaldoPen: Number(totalSaldoPen.toFixed(2)),
        totalSaldoUsd: Number(totalSaldoUsd.toFixed(2)),
        cuentas: cuentasResumen,
        saldoPorTipoCuenta: Array.from(saldoPorTipoCuentaMap.values()).sort(
          (a, b) => b.saldoTotal - a.saldoTotal,
        ),
      });
    } catch (error) {
      console.error('Error al obtener resumen principal:', error);
      return new StatusResponse(false, 500, 'Error al obtener resumen principal', error);
    }
  }
}
