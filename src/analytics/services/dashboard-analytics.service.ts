import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StatusResponse } from 'src/common/dto/response.dto';
import { Usuario } from 'src/security/entities/usuario.entity';
import { Repository } from 'typeorm';
import { Transaccion } from 'src/finance/entities/transaccion.entity';
import {
  DashboardAnalyticsResponseDto,
  DashboardAnomalyItemDto,
  DashboardPredictionItemDto,
  DashboardSegmentClusterDto,
  DashboardSegmentProfileDto,
} from '../dto/dashboard-analytics.dto';

interface AnalyticsTxPayload {
  id: number;
  fecha: string;
  monto: number;
  tipo: string;
  categoriaNombre: string;
  subcategoriaNombre: string;
  monedaCodigo: string;
}

interface MlPredictionResponse {
  proximoMes: string;
  items: DashboardPredictionItemDto[];
  modelVersion?: string;
}

interface MlAnomalyResponse {
  total: number;
  items: DashboardAnomalyItemDto[];
  modelVersion?: string;
}

interface MlSegmentationResponse {
  perfil: DashboardSegmentProfileDto;
  clusters: DashboardSegmentClusterDto[];
  modelVersion?: string;
}

@Injectable()
export class DashboardAnalyticsService {
  private readonly mlServiceUrl =
    process.env.ML_SERVICE_URL ?? 'http://127.0.0.1:8001';
  private readonly mlTimeoutMs = this.toBoundedNumber(
    process.env.ML_SERVICE_TIMEOUT_MS,
    8000,
    2000,
    30000,
  );
  private readonly lookbackDays = this.toBoundedNumber(
    process.env.ANALYTICS_LOOKBACK_DAYS,
    365,
    30,
    1095,
  );
  private readonly maxTransactions = this.toBoundedNumber(
    process.env.ANALYTICS_MAX_TRANSACTIONS,
    1200,
    100,
    5000,
  );

  constructor(
    @InjectRepository(Transaccion)
    private readonly transaccionRepository: Repository<Transaccion>,
  ) {}

  async getInsights(
    usuario: Usuario,
  ): Promise<StatusResponse<DashboardAnalyticsResponseDto>> {
    const rows = await this.loadTransactions(usuario.id);
    const payload = rows.map((item) => this.toPayload(item));

    const fallbackPrediction = this.buildFallbackPrediction(payload);
    const fallbackAnomalies = this.buildFallbackAnomalies(payload);
    const fallbackSegmentation = this.buildFallbackSegmentation(payload);

    const [mlPrediction, mlAnomalies, mlSegmentation] = await Promise.allSettled([
      this.postMl<MlPredictionResponse>('/v1/predict/category-spend', {
        transactions: payload,
        top_k: 6,
      }),
      this.postMl<MlAnomalyResponse>('/v1/detect/anomalies', {
        transactions: payload,
        top_k: 15,
      }),
      this.postMl<MlSegmentationResponse>('/v1/segment/habits', {
        transactions: payload,
      }),
    ]);

    const prediction =
      mlPrediction.status === 'fulfilled' && mlPrediction.value?.items?.length > 0
        ? { ...mlPrediction.value, fuente: 'ML_SERVICE' as const }
        : { ...fallbackPrediction, fuente: 'FALLBACK' as const };

    const anomalies =
      mlAnomalies.status === 'fulfilled'
        ? { ...mlAnomalies.value, fuente: 'ML_SERVICE' as const }
        : { ...fallbackAnomalies, fuente: 'FALLBACK' as const };

    const segmentation =
      mlSegmentation.status === 'fulfilled'
        ? { ...mlSegmentation.value, fuente: 'ML_SERVICE' as const }
        : { ...fallbackSegmentation, fuente: 'FALLBACK' as const };

    const from = rows.at(-1)?.fecha ?? new Date();
    const to = rows[0]?.fecha ?? new Date();

    const data: DashboardAnalyticsResponseDto = {
      periodoInicio: this.toDateOnlyIso(from),
      periodoFin: this.toDateOnlyIso(to),
      cantidadTransacciones: payload.length,
      prediccion: {
        proximoMes: prediction.proximoMes,
        items: prediction.items ?? [],
        fuente: prediction.fuente,
      },
      anomalias: {
        total: Number(anomalies.total ?? (anomalies.items?.length ?? 0)),
        items: anomalies.items ?? [],
        fuente: anomalies.fuente,
      },
      segmentacion: {
        perfil: segmentation.perfil,
        clusters: segmentation.clusters ?? [],
        fuente: segmentation.fuente,
      },
      metadata: {
        proveedor: this.mlServiceUrl,
        versionModelo:
          this.pickVersion(mlPrediction, mlAnomalies, mlSegmentation) ??
          'fallback-v1',
        generadoEn: new Date().toISOString(),
      },
    };

    return new StatusResponse(true, 200, 'Insights de dashboard obtenidos', data);
  }

  private async loadTransactions(idUsuario: number): Promise<Transaccion[]> {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - this.lookbackDays);

    return this.transaccionRepository
      .createQueryBuilder('transaccion')
      .innerJoin('transaccion.usuario', 'usuario')
      .innerJoinAndSelect('transaccion.cuenta', 'cuenta')
      .innerJoinAndSelect('cuenta.moneda', 'moneda')
      .leftJoinAndSelect('transaccion.categoria', 'categoria')
      .leftJoinAndSelect('transaccion.subcategoria', 'subcategoria')
      .where('usuario.id = :idUsuario', { idUsuario })
      .andWhere('transaccion.activo = :activo', { activo: true })
      .andWhere('transaccion.eliminado = :eliminado', { eliminado: false })
      .andWhere('transaccion.fecha >= :fromDate', { fromDate })
      .orderBy('transaccion.fecha', 'DESC')
      .addOrderBy('transaccion.id', 'DESC')
      .take(this.maxTransactions)
      .getMany();
  }

  private toPayload(item: Transaccion): AnalyticsTxPayload {
    return {
      id: Number(item.id),
      fecha: item.fecha instanceof Date ? item.fecha.toISOString() : String(item.fecha),
      monto: Number(item.monto ?? 0),
      tipo: item.tipo,
      categoriaNombre: item.categoria?.nombre ?? 'SIN_CATEGORIA',
      subcategoriaNombre: item.subcategoria?.nombre ?? 'SIN_SUBCATEGORIA',
      monedaCodigo: item.cuenta?.moneda?.codigo ?? 'N/A',
    };
  }

  private async postMl<T>(
    path: string,
    payload: Record<string, unknown>,
  ): Promise<T> {
    const url = `${this.mlServiceUrl}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.mlTimeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`ML service ${response.status}: ${text}`);
      }
      return (await response.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildFallbackPrediction(rows: AnalyticsTxPayload[]): {
    proximoMes: string;
    items: DashboardPredictionItemDto[];
  } {
    const egresos = rows.filter((item) => item.tipo === 'EGRESO' && item.monto > 0);
    const perCategory = new Map<string, number[]>();
    for (const item of egresos) {
      const key = item.categoriaNombre || 'SIN_CATEGORIA';
      const list = perCategory.get(key) ?? [];
      list.push(item.monto);
      perCategory.set(key, list.slice(0, 6));
    }

    const items: DashboardPredictionItemDto[] = Array.from(perCategory.entries())
      .map(([categoria, montos]) => {
        const avg = montos.reduce((sum, x) => sum + x, 0) / Math.max(montos.length, 1);
        const trend = this.detectTrend(montos);
        const confianza = Number(Math.min(0.85, 0.45 + montos.length * 0.07).toFixed(2));
        return {
          categoriaNombre: categoria,
          montoPredicho: Number(avg.toFixed(2)),
          confianza,
          tendencia: trend,
        };
      })
      .sort((a, b) => b.montoPredicho - a.montoPredicho)
      .slice(0, 6);

    return {
      proximoMes: this.getNextMonthLabel(),
      items,
    };
  }

  private buildFallbackAnomalies(rows: AnalyticsTxPayload[]): {
    total: number;
    items: DashboardAnomalyItemDto[];
  } {
    const egresos = rows.filter((item) => item.tipo === 'EGRESO' && item.monto > 0);
    if (egresos.length < 8) {
      return { total: 0, items: [] };
    }

    const amounts = egresos.map((item) => item.monto);
    const mean = amounts.reduce((sum, x) => sum + x, 0) / amounts.length;
    const variance =
      amounts.reduce((sum, x) => sum + (x - mean) * (x - mean), 0) /
      Math.max(amounts.length - 1, 1);
    const std = Math.sqrt(variance);
    const threshold = mean + std * 2.1;

    const items = egresos
      .filter((item) => item.monto >= threshold)
      .slice(0, 15)
      .map((item) => {
        const score = std > 0 ? Number(((item.monto - mean) / std).toFixed(3)) : 0;
        return {
          idTransaccion: item.id,
          fecha: item.fecha,
          monto: Number(item.monto.toFixed(2)),
          categoriaNombre: item.categoriaNombre,
          score,
          severidad: score > 3 ? 'ALTA' : score > 2.5 ? 'MEDIA' : 'BAJA',
          motivo: 'Monto superior a patron historico',
        } satisfies DashboardAnomalyItemDto;
      });

    return {
      total: items.length,
      items,
    };
  }

  private buildFallbackSegmentation(rows: AnalyticsTxPayload[]): {
    perfil: DashboardSegmentProfileDto;
    clusters: DashboardSegmentClusterDto[];
  } {
    const egresos = rows.filter((item) => item.tipo === 'EGRESO' && item.monto > 0);
    const total = egresos.reduce((sum, item) => sum + item.monto, 0);
    const essentialKeywords = ['COMIDA', 'TRANSPORTE', 'SALUD', 'SERVICIO', 'HOGAR'];
    const essential = egresos.filter((item) => {
      const up = (item.categoriaNombre ?? '').toUpperCase();
      return essentialKeywords.some((key) => up.includes(key));
    });
    const essentialTotal = essential.reduce((sum, item) => sum + item.monto, 0);
    const essentialRatio = total > 0 ? essentialTotal / total : 0;

    const monthlyMap = new Map<string, number>();
    for (const tx of egresos) {
      const month = tx.fecha.slice(0, 7);
      monthlyMap.set(month, (monthlyMap.get(month) ?? 0) + tx.monto);
    }
    const monthlyValues = Array.from(monthlyMap.values());
    const mean =
      monthlyValues.reduce((sum, x) => sum + x, 0) / Math.max(monthlyValues.length, 1);
    const std = Math.sqrt(
      monthlyValues.reduce((sum, x) => sum + (x - mean) * (x - mean), 0) /
        Math.max(monthlyValues.length - 1, 1),
    );
    const cv = mean > 0 ? std / mean : 0;

    const perfil = this.resolveProfile(essentialRatio, cv, egresos.length);

    const clusterEsencial: DashboardSegmentClusterDto = {
      nombre: 'Consumo esencial',
      participacion: Number((essentialRatio * 100).toFixed(2)),
      montoPromedio: Number(
        (essential.length > 0 ? essentialTotal / essential.length : 0).toFixed(2),
      ),
      categoriasDominantes: this.topCategories(essential, 3),
    };

    const discretionary = egresos.filter((item) => !essential.includes(item));
    const discretionaryTotal = discretionary.reduce((sum, item) => sum + item.monto, 0);
    const discRatio = total > 0 ? discretionaryTotal / total : 0;
    const clusterDiscrecional: DashboardSegmentClusterDto = {
      nombre: 'Consumo discrecional',
      participacion: Number((discRatio * 100).toFixed(2)),
      montoPromedio: Number(
        (
          discretionary.length > 0
            ? discretionaryTotal / discretionary.length
            : 0
        ).toFixed(2),
      ),
      categoriasDominantes: this.topCategories(discretionary, 3),
    };

    return {
      perfil,
      clusters: [clusterEsencial, clusterDiscrecional],
    };
  }

  private resolveProfile(
    essentialRatio: number,
    cv: number,
    txCount: number,
  ): DashboardSegmentProfileDto {
    if (txCount < 12) {
      return {
        nombre: 'Perfil en construccion',
        descripcion:
          'Aun no hay suficientes movimientos para determinar un patron estable.',
        confianza: 0.4,
      };
    }
    if (essentialRatio >= 0.6 && cv < 0.35) {
      return {
        nombre: 'Consumo disciplinado',
        descripcion:
          'Tus gastos se concentran en rubros esenciales y con variacion mensual baja.',
        confianza: 0.82,
      };
    }
    if (essentialRatio < 0.45 && cv >= 0.45) {
      return {
        nombre: 'Consumo expansivo',
        descripcion:
          'Presentas alta variacion y mayor peso de gastos discrecionales.',
        confianza: 0.78,
      };
    }
    return {
      nombre: 'Consumo balanceado',
      descripcion:
        'Mantienes una mezcla entre gasto esencial y discrecional con variacion moderada.',
      confianza: 0.7,
    };
  }

  private topCategories(rows: AnalyticsTxPayload[], topK: number): string[] {
    const map = new Map<string, number>();
    for (const item of rows) {
      map.set(item.categoriaNombre, (map.get(item.categoriaNombre) ?? 0) + item.monto);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topK)
      .map(([name]) => name);
  }

  private detectTrend(montos: number[]): 'UP' | 'DOWN' | 'STABLE' {
    if (montos.length < 2) {
      return 'STABLE';
    }
    const first = montos[montos.length - 1];
    const last = montos[0];
    if (last >= first * 1.12) {
      return 'UP';
    }
    if (last <= first * 0.88) {
      return 'DOWN';
    }
    return 'STABLE';
  }

  private getNextMonthLabel(): string {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const year = next.getFullYear();
    const month = `${next.getMonth() + 1}`.padStart(2, '0');
    return `${year}-${month}`;
  }

  private toDateOnlyIso(value: Date): string {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
      return new Date().toISOString().slice(0, 10);
    }
    return value.toISOString().slice(0, 10);
  }

  private toBoundedNumber(
    raw: string | undefined,
    fallback: number,
    min: number,
    max: number,
  ): number {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }
    return Math.max(min, Math.min(max, Math.trunc(parsed)));
  }

  private pickVersion(
    prediction: PromiseSettledResult<MlPredictionResponse>,
    anomalies: PromiseSettledResult<MlAnomalyResponse>,
    segmentation: PromiseSettledResult<MlSegmentationResponse>,
  ): string | null {
    if (prediction.status === 'fulfilled' && prediction.value.modelVersion) {
      return prediction.value.modelVersion;
    }
    if (anomalies.status === 'fulfilled' && anomalies.value.modelVersion) {
      return anomalies.value.modelVersion;
    }
    if (segmentation.status === 'fulfilled' && segmentation.value.modelVersion) {
      return segmentation.value.modelVersion;
    }
    return null;
  }
}
