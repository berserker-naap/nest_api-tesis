import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StatusResponse } from 'src/common/dto/response.dto';
import { Repository } from 'typeorm';
import { TipoCambioDataResponseDto } from '../dto/tipo-cambio.dto';
import { TipoCambioData } from '../entities/tipo-cambio-data.entity';

interface ExternalRateResolved {
  tasaUsdPen: number;
  fuente: string;
  proveedorBase: string | null;
  fechaProveedor: string | null;
  fechaHoraProveedor: Date | null;
  payloadProveedor: string | null;
}

@Injectable()
export class TipoCambioDataService {
  private readonly monedaOrigen = 'USD';
  private readonly monedaDestino = 'PEN';
  private readonly fuente = 'manage.exchangeratesapi.io';

  constructor(
    @InjectRepository(TipoCambioData)
    private readonly tipoCambioRepository: Repository<TipoCambioData>,
  ) {}

  async getToday(): Promise<StatusResponse<TipoCambioDataResponseDto | null>> {
    return this.getOrCreateByFecha(this.getTodayLima());
  }

  async getByFecha(fecha: string): Promise<StatusResponse<TipoCambioDataResponseDto | null>> {
    if (!this.isValidDate(fecha)) {
      return new StatusResponse(false, 400, 'Formato de fecha invalido. Usa YYYY-MM-DD.', null);
    }
    return this.getOrCreateByFecha(this.normalizeIsoDate(fecha));
  }

  async getHistorico(
    desde?: string,
    hasta?: string,
    limit = 60,
  ): Promise<StatusResponse<TipoCambioDataResponseDto[] | null>> {
    try {
      if (desde && !this.isValidDate(desde)) {
        return new StatusResponse(false, 400, 'Parametro "desde" invalido. Usa YYYY-MM-DD.', null);
      }
      if (hasta && !this.isValidDate(hasta)) {
        return new StatusResponse(false, 400, 'Parametro "hasta" invalido. Usa YYYY-MM-DD.', null);
      }

      const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(365, limit)) : 60;
      const qb = this.tipoCambioRepository
        .createQueryBuilder('tc')
        .where('tc.activo = :activo', { activo: true })
        .andWhere('tc.eliminado = :eliminado', { eliminado: false })
        .andWhere('tc.monedaOrigen = :origen', { origen: this.monedaOrigen })
        .andWhere('tc.monedaDestino = :destino', { destino: this.monedaDestino });

      if (desde) {
        qb.andWhere('tc.fechaConsulta >= :desde', { desde });
      }
      if (hasta) {
        qb.andWhere('tc.fechaConsulta <= :hasta', { hasta });
      }

      const rows = await qb
        .orderBy('tc.fechaConsulta', 'DESC')
        .addOrderBy('tc.id', 'DESC')
        .take(safeLimit)
        .getMany();

      return new StatusResponse(
        true,
        200,
        'Historico de tipo de cambio obtenido',
        rows.map((row) => this.toResponse(row)),
      );
    } catch (error) {
      console.error('Error al obtener historico de tipo de cambio:', error);
      return new StatusResponse(false, 500, 'Error al obtener historico de tipo de cambio', null);
    }
  }

  private async getOrCreateByFecha(
    fechaConsulta: string,
  ): Promise<StatusResponse<TipoCambioDataResponseDto | null>> {
    try {
      const fechaNormalizada = this.normalizeIsoDate(fechaConsulta);
      const existente = await this.findLatestByFecha(fechaNormalizada);

      if (existente) {
        return new StatusResponse(true, 200, 'Tipo de cambio obtenido desde cache', this.toResponse(existente));
      }

      const hoyLima = this.getTodayLima();
      if (fechaNormalizada !== hoyLima) {
        return new StatusResponse(
          false,
          404,
          `No existe tipo de cambio cacheado para ${fechaNormalizada}.`,
          null,
        );
      }

      const external = await this.fetchExternalRate();
      const penUsd = Number((1 / external.tasaUsdPen).toFixed(6));

      const created = this.tipoCambioRepository.create({
        fechaConsulta: fechaNormalizada,
        monedaOrigen: this.monedaOrigen,
        monedaDestino: this.monedaDestino,
        tasaOrigenADestino: Number(external.tasaUsdPen.toFixed(6)),
        tasaDestinoAOrigen: penUsd,
        fuente: external.fuente,
        proveedorBase: external.proveedorBase,
        fechaProveedor: external.fechaProveedor,
        fechaHoraProveedor: external.fechaHoraProveedor,
        payloadProveedor: external.payloadProveedor,
        usuarioRegistro: 'SYSTEM',
        ipRegistro: '127.0.0.1',
      });

      const saved = await this.tipoCambioRepository.save(created);
      return new StatusResponse(
        true,
        200,
        'Tipo de cambio obtenido desde API y cacheado',
        this.toResponse(saved),
      );
    } catch (error) {
      console.error('Error al obtener tipo de cambio:', error);
      return new StatusResponse(false, 500, 'Error al obtener tipo de cambio', null);
    }
  }

  private toResponse(entity: TipoCambioData): TipoCambioDataResponseDto {
    return {
      fechaConsulta: entity.fechaConsulta,
      monedaOrigen: entity.monedaOrigen,
      monedaDestino: entity.monedaDestino,
      tasaOrigenADestino: Number(entity.tasaOrigenADestino),
      tasaDestinoAOrigen: Number(entity.tasaDestinoAOrigen),
      proveedorBase: entity.proveedorBase,
    };
  }

  private async fetchExternalRate(): Promise<ExternalRateResolved> {
    const apiKey = process.env.EXCHANGERATES_API_KEY ?? '';
    if (!apiKey) {
      throw new Error('EXCHANGERATES_API_KEY no configurado.');
    }

    const endpointBase = process.env.EXCHANGERATES_API_URL ?? 'https://api.exchangeratesapi.io/v1/latest';
    const url = new URL(endpointBase);
    url.searchParams.set('access_key', apiKey);
    url.searchParams.set('symbols', `${this.monedaOrigen},${this.monedaDestino}`);

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Proveedor externo respondio ${response.status}`);
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const success = payload?.success as boolean | undefined;
    if (success === false) {
      const errorBlock = payload?.error as Record<string, unknown> | undefined;
      const info = String(errorBlock?.info ?? 'Error desconocido del proveedor');
      throw new Error(info);
    }

    const rates = (payload?.rates ?? {}) as Record<string, number>;
    const base = String(payload?.base ?? '').toUpperCase();
    const usdRate = Number(rates.USD);
    const penRate = Number(rates.PEN);

    let tasaUsdPen: number;
    if (base === 'USD' && Number.isFinite(penRate) && penRate > 0) {
      tasaUsdPen = penRate;
    } else if (Number.isFinite(usdRate) && usdRate > 0 && Number.isFinite(penRate) && penRate > 0) {
      tasaUsdPen = penRate / usdRate;
    } else {
      throw new Error('No se pudo resolver la tasa USD->PEN desde la respuesta externa.');
    }

    const timestamp = Number(payload?.timestamp);
    const fechaHoraProveedor = Number.isFinite(timestamp) && timestamp > 0
      ? new Date(timestamp * 1000)
      : null;
    const fechaProveedorRaw = payload?.date;
    const fechaProveedor = typeof fechaProveedorRaw === 'string' && this.isValidDate(fechaProveedorRaw)
      ? fechaProveedorRaw
      : null;

    return {
      tasaUsdPen,
      fuente: this.fuente,
      proveedorBase: base || null,
      fechaProveedor,
      fechaHoraProveedor,
      payloadProveedor: JSON.stringify(payload),
    };
  }

  private getTodayLima(): string {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());

    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;
    if (!year || !month || !day) {
      throw new Error('No se pudo resolver la fecha de Lima.');
    }

    return `${year}-${month}-${day}`;
  }

  private isValidDate(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
  }

  private normalizeIsoDate(value: string): string {
    return value.trim();
  }

  private async findLatestByFecha(fechaConsulta: string): Promise<TipoCambioData | null> {
    return this.tipoCambioRepository
      .createQueryBuilder('tc')
      .where('CONVERT(varchar(10), tc.fechaConsulta, 23) = :fechaConsulta', { fechaConsulta })
      .andWhere('tc.activo = :activo', { activo: true })
      .andWhere('tc.eliminado = :eliminado', { eliminado: false })
      .andWhere('tc.monedaOrigen = :origen', { origen: this.monedaOrigen })
      .andWhere('tc.monedaDestino = :destino', { destino: this.monedaDestino })
      .orderBy('tc.id', 'DESC')
      .getOne();
  }
}
