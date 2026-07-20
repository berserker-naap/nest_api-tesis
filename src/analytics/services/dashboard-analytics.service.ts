import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StatusResponse } from 'src/common/dto/response.dto';
import { Usuario } from 'src/security/entities/usuario.entity';
import { Repository } from 'typeorm';
import { Transaccion } from 'src/finance/entities/transaccion.entity';
import {
  OrigenTransaccion,
  TipoTransaccion,
} from 'src/finance/enum/transaccion.enum';
import {
  DashboardAnalyticsResponseDto,
  DashboardAnomalyItemDto,
  DashboardPredictionItemDto,
  DashboardSegmentClusterDto,
  DashboardSegmentProfileDto,
} from '../dto/dashboard-analytics.dto';
import {
  ANALYTICS_OTHER_CATEGORY,
  analyticsCategoryName,
  isAnalyticsExpense,
} from '../utils/analytics-transaction.util';
import {
  MIN_BUDGET_CONFIDENCE,
  calculatePredictionConfidence,
  calculateSavingsRate,
} from '../utils/analytics-prediction.util';

interface AnalyticsTxPayload {
  id: number;
  idCategoria: number | null;
  fecha: string;
  monto: number;
  tipo: string;
  categoriaNombre: string;
  subcategoriaNombre: string;
  monedaCodigo: string;
  origen: string;
  concepto: string;
  descripcion: string;
  esMovimientoInterno: boolean;
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
    const payload = rows
      .map((item) => this.toPayload(item))
      .filter((item) => item.monedaCodigo === 'PEN');

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

    const categoryIdByName = this.categoryIdMap(payload);
    const transactionById = new Map(payload.map((item) => [item.id, item]));
    const predictionItems = (prediction.items ?? []).map((item) => {
      const normalizedCategory = this.normalizeCategory(item.categoriaNombre);
      const idCategoria = categoryIdByName.get(normalizedCategory) ?? null;
      const confidence = Number(item.confianza ?? 0);
      const aptoPresupuesto =
        idCategoria !== null &&
        confidence >= MIN_BUDGET_CONFIDENCE &&
        normalizedCategory !== ANALYTICS_OTHER_CATEGORY;
      return {
        ...item,
        idCategoria,
        aptoPresupuesto,
        montoPresupuestoSugerido: aptoPresupuesto
          ? Number(
              (
                Number(item.montoPredicho) *
                (1 - calculateSavingsRate(confidence))
              ).toFixed(2),
            )
          : null,
      };
    });
    const anomalyItems = (anomalies.items ?? []).map((item) => {
      const transaction = item.idTransaccion ? transactionById.get(item.idTransaccion) : undefined;
      return {
        ...item,
        idCategoria:
          transaction?.idCategoria ??
          categoryIdByName.get(this.normalizeCategory(item.categoriaNombre)) ??
          null,
        monedaCodigo: transaction?.monedaCodigo ?? 'PEN',
        monedaSimbolo: 'S/',
      };
    });
    const segmentClusters = (segmentation.clusters ?? []).map((cluster) => ({
      ...cluster,
      categoriasDominantesDetalle: (cluster.categoriasDominantes ?? []).map((nombre) => ({
        idCategoria: categoryIdByName.get(this.normalizeCategory(nombre)) ?? null,
        nombre,
      })),
    }));
    const eligibleSavings = predictionItems.filter((item) => item.aptoPresupuesto);
    const rising = [...eligibleSavings]
      .filter((item) => item.tendencia === 'UP')
      .sort((a, b) => b.montoPredicho - a.montoPredicho)[0] ?? null;
    const savingBase = [...eligibleSavings]
      .sort((a, b) => b.montoPredicho - a.montoPredicho)[0] ?? null;

    const data: DashboardAnalyticsResponseDto = {
      periodoInicio: this.toDateOnlyIso(from),
      periodoFin: this.toDateOnlyIso(to),
      cantidadTransacciones: payload.length,
      monedaCodigo: 'PEN',
      monedaSimbolo: 'S/',
      resumenAccionable: {
        totalPredicho: Number(
          predictionItems.reduce((sum, item) => sum + Number(item.montoPredicho || 0), 0).toFixed(2),
        ),
        categoriaMayorCrecimiento: rising
          ? { idCategoria: rising.idCategoria, nombre: rising.categoriaNombre }
          : null,
        oportunidadAhorro: savingBase
          ? {
              idCategoria: savingBase.idCategoria,
              nombre: savingBase.categoriaNombre,
              montoEstimado: Number(
                (
                  savingBase.montoPredicho -
                  Number(
                    savingBase.montoPresupuestoSugerido ??
                      savingBase.montoPredicho,
                  )
                ).toFixed(2),
              ),
            }
          : null,
      },
      prediccion: {
        proximoMes: prediction.proximoMes,
        items: predictionItems,
        fuente: prediction.fuente,
      },
      anomalias: {
        total: Number(anomalies.total ?? (anomalies.items?.length ?? 0)),
        items: anomalyItems,
        fuente: anomalies.fuente,
      },
      segmentacion: {
        perfil: segmentation.perfil,
        clusters: segmentClusters,
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

    const candidates = await this.transaccionRepository
      .createQueryBuilder('transaccion')
      .innerJoin('transaccion.usuario', 'usuario')
      .innerJoinAndSelect('transaccion.cuenta', 'cuenta')
      .innerJoinAndSelect('cuenta.moneda', 'moneda')
      .leftJoinAndSelect('transaccion.categoria', 'categoria')
      .leftJoinAndSelect('transaccion.subcategoria', 'subcategoria')
      .where('usuario.id = :idUsuario', { idUsuario })
      .andWhere('transaccion.activo = :activo', { activo: true })
      .andWhere('transaccion.eliminado = :eliminado', { eliminado: false })
      .andWhere('transaccion.tipo = :expenseType', {
        expenseType: TipoTransaccion.EGRESO,
      })
      .andWhere('transaccion.monto > 0')
      .andWhere('transaccion.origen NOT IN (:...internalOrigins)', {
        internalOrigins: [
          OrigenTransaccion.APERTURA,
          OrigenTransaccion.TRANSFERENCIA,
          OrigenTransaccion.PAGO_TARJETA,
        ],
      })
      .andWhere('transaccion.fecha >= :fromDate', { fromDate })
      .orderBy('transaccion.fecha', 'DESC')
      .addOrderBy('transaccion.id', 'DESC')
      .take(this.maxTransactions * 2)
      .getMany();

    return candidates
      .filter((transaction) => isAnalyticsExpense(transaction))
      .slice(0, this.maxTransactions);
  }

  private toPayload(item: Transaccion): AnalyticsTxPayload {
    return {
      id: Number(item.id),
      idCategoria: item.categoria?.id ?? null,
      fecha: item.fecha instanceof Date ? item.fecha.toISOString() : String(item.fecha),
      monto: Number(item.monto ?? 0),
      tipo: item.tipo,
      categoriaNombre: analyticsCategoryName(item.categoria?.nombre),
      subcategoriaNombre: analyticsCategoryName(item.subcategoria?.nombre),
      monedaCodigo: item.cuenta?.moneda?.codigo ?? 'N/A',
      origen: item.origen,
      concepto: item.concepto,
      descripcion: item.descripcion ?? '',
      esMovimientoInterno: false,
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
    const perCategory = new Map<string, Map<string, number>>();
    for (const item of egresos) {
      const key = item.categoriaNombre || ANALYTICS_OTHER_CATEGORY;
      const month = item.fecha.slice(0, 7);
      const monthly = perCategory.get(key) ?? new Map<string, number>();
      monthly.set(month, (monthly.get(month) ?? 0) + item.monto);
      perCategory.set(key, monthly);
    }

    const items: DashboardPredictionItemDto[] = Array.from(perCategory.entries())
      .map(([categoria, monthly]) => {
        const currentMonth = new Date().toISOString().slice(0, 7);
        const allMonths = Array.from(monthly.entries()).sort(([a], [b]) => b.localeCompare(a));
        const completedMonths = allMonths.filter(([month]) => month !== currentMonth);
        const montos = (completedMonths.length > 0 ? completedMonths : allMonths)
          .slice(0, 6)
          .map(([, amount]) => amount);
        const weighted = montos.reduce(
          (result, amount, index) => {
            const weight = montos.length - index;
            return {
              total: result.total + amount * weight,
              weights: result.weights + weight,
            };
          },
          { total: 0, weights: 0 },
        );
        const avg = weighted.total / Math.max(weighted.weights, 1);
        const trend = this.detectTrend(montos);
        const movementCount = egresos.filter(
          (item) => this.normalizeCategory(item.categoriaNombre) === this.normalizeCategory(categoria),
        ).length;
        const confianza = calculatePredictionConfidence(montos, movementCount);
        return {
          idCategoria: null,
          categoriaNombre: categoria,
          montoPredicho: Number(avg.toFixed(2)),
          confianza,
          aptoPresupuesto: false,
          montoPresupuestoSugerido: null,
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
          idCategoria: item.idCategoria,
          fecha: item.fecha,
          monto: Number(item.monto.toFixed(2)),
          categoriaNombre: item.categoriaNombre,
          score,
          severidad: score > 3 ? 'ALTA' : score > 2.5 ? 'MEDIA' : 'BAJA',
          motivo: 'Monto superior a patron historico',
          monedaCodigo: item.monedaCodigo,
          monedaSimbolo: item.monedaCodigo === 'PEN' ? 'S/' : '$',
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
      categoriasDominantesDetalle: [],
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
      categoriasDominantesDetalle: [],
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

  private categoryIdMap(rows: AnalyticsTxPayload[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const item of rows) {
      if (item.idCategoria) map.set(this.normalizeCategory(item.categoriaNombre), item.idCategoria);
    }
    return map;
  }

  private normalizeCategory(value: string): string {
    return (value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
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
