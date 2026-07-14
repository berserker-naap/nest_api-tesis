import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BalanceAccountService } from 'src/finance/services/balance-account.service';
import { TipoCambioDataService } from 'src/finance/services/tipo-cambio-data.service';
import { Transaccion } from 'src/finance/entities/transaccion.entity';
import { CategoriaFinance } from 'src/finance/entities/categoria-finance.entity';
import { SubcategoriaFinance } from 'src/finance/entities/subcategoria-finance.entity';

type CuentaResumen = {
  id: number;
  alias: string;
  saldoActual: number;
  lineaCredito: number | null;
  monedaCodigo: string;
  tipoCuenta: string;
};

type DateRangeFilter = {
  from: Date;
  toExclusive: Date;
  label: string;
};

type FilterCatalogs = {
  cuentas: CuentaResumen[];
  categorias: CategoriaFinance[];
  subcategorias: SubcategoriaFinance[];
};

type ResolvedTransactionFilters = {
  dateRange: DateRangeFilter | null;
  matchedAccounts: CuentaResumen[];
  matchedCategories: CategoriaFinance[];
  matchedSubcategories: SubcategoriaFinance[];
  hasStructuredFilters: boolean;
};

@Injectable()
export class AssistantFinanceToolsService {
  private readonly txLimit = this.toBoundedNumber(
    process.env.ASSISTANT_RECENT_TX_LIMIT,
    20,
    5,
    50,
  );
  private readonly filteredTxLimit = this.toBoundedNumber(
    process.env.ASSISTANT_FILTERED_TX_LIMIT,
    120,
    20,
    250,
  );

  constructor(
    private readonly balanceAccountService: BalanceAccountService,
    private readonly tipoCambioDataService: TipoCambioDataService,
    @InjectRepository(Transaccion)
    private readonly transaccionRepository: Repository<Transaccion>,
    @InjectRepository(CategoriaFinance)
    private readonly categoriaRepository: Repository<CategoriaFinance>,
    @InjectRepository(SubcategoriaFinance)
    private readonly subcategoriaRepository: Repository<SubcategoriaFinance>,
  ) {}

  async buildContextForQuestion(
    idUsuario: number,
    userQuestion: string,
  ): Promise<{ toolsUsed: string[]; context: Record<string, unknown> }> {
    const toolsUsed: string[] = [];
    const question = this.normalize(userQuestion);

    const summaryResponse = await this.balanceAccountService.getResumen(idUsuario);
    const summaryData = summaryResponse.ok ? summaryResponse.data : null;
    toolsUsed.push('balance_account_summary');

    const cuentas = this.extractAccountsFromSummary(summaryData);
    const shouldIncludeAccountLists =
      question.includes('cuenta') ||
      question.includes('tarjeta') ||
      question.includes('deuda') ||
      question.includes('credito') ||
      question.includes('saldo por tipo');

    const shouldIncludeFx =
      question.includes('tipo de cambio') ||
      question.includes('dolar') ||
      question.includes('usd') ||
      question.includes('soles') ||
      question.includes('pen');

    const catalogs = await this.loadFilterCatalogs(cuentas);
    const filters = this.resolveTransactionFilters(question, catalogs);
    const shouldIncludeTx =
      question.includes('transaccion') ||
      question.includes('gasto') ||
      question.includes('egreso') ||
      question.includes('ingreso') ||
      question.includes('movimiento') ||
      question.includes('categoria') ||
      question.includes('transferencia') ||
      filters.hasStructuredFilters;

    const context: Record<string, unknown> = {
      summary: this.buildCompactSummary(
        summaryData,
        shouldIncludeAccountLists || filters.matchedAccounts.length > 0,
      ),
    };

    if (shouldIncludeFx) {
      const fxResponse = await this.tipoCambioDataService.getToday();
      const fxData = fxResponse.ok ? fxResponse.data : null;
      context.tipoCambioToday = fxData
        ? {
            fechaConsulta: fxData.fechaConsulta,
            monedaOrigen: fxData.monedaOrigen,
            monedaDestino: fxData.monedaDestino,
            tasaOrigenADestino: Number(fxData.tasaOrigenADestino),
            tasaDestinoAOrigen: Number(fxData.tasaDestinoAOrigen),
          }
        : null;
      toolsUsed.push('tipo_cambio_today');
    }

    if (shouldIncludeTx) {
      context.transactionContext = await this.buildTransactionContext(
        idUsuario,
        filters,
      );
      toolsUsed.push(
        filters.hasStructuredFilters
          ? 'filtered_transactions'
          : 'recent_transactions',
      );
    }

    return { toolsUsed, context };
  }

  private async loadFilterCatalogs(
    cuentas: CuentaResumen[],
  ): Promise<FilterCatalogs> {
    const [categorias, subcategorias] = await Promise.all([
      this.categoriaRepository.find({
        where: {
          activo: true,
          eliminado: false,
        },
        order: { orden: 'ASC', id: 'ASC' },
      }),
      this.subcategoriaRepository.find({
        where: {
          activo: true,
          eliminado: false,
        },
        relations: ['categoria'],
        order: { orden: 'ASC', id: 'ASC' },
      }),
    ]);

    return {
      cuentas,
      categorias,
      subcategorias,
    };
  }

  private resolveTransactionFilters(
    question: string,
    catalogs: FilterCatalogs,
  ): ResolvedTransactionFilters {
    const dateRange = this.extractDateRange(question);
    const matchedAccounts = catalogs.cuentas.filter((item) =>
      this.containsPhrase(question, item.alias),
    );
    const matchedCategories = catalogs.categorias.filter((item) =>
      this.containsPhrase(question, item.nombre),
    );
    const matchedSubcategories = catalogs.subcategorias.filter((item) =>
      this.containsPhrase(question, item.nombre),
    );

    return {
      dateRange,
      matchedAccounts,
      matchedCategories,
      matchedSubcategories,
      hasStructuredFilters: Boolean(
        dateRange ||
          matchedAccounts.length ||
          matchedCategories.length ||
          matchedSubcategories.length,
      ),
    };
  }

  private async buildTransactionContext(
    idUsuario: number,
    filters: ResolvedTransactionFilters,
  ): Promise<Record<string, unknown>> {
    const qb = this.transaccionRepository
      .createQueryBuilder('transaccion')
      .innerJoin('transaccion.usuario', 'usuario')
      .leftJoinAndSelect('transaccion.categoria', 'categoria')
      .leftJoinAndSelect('transaccion.subcategoria', 'subcategoria')
      .leftJoinAndSelect('transaccion.cuenta', 'cuenta')
      .leftJoinAndSelect('cuenta.moneda', 'moneda')
      .where('usuario.id = :idUsuario', { idUsuario })
      .andWhere('transaccion.activo = :activo', { activo: true })
      .andWhere('transaccion.eliminado = :eliminado', { eliminado: false });

    if (filters.dateRange) {
      qb.andWhere('transaccion.fecha >= :fromDate', {
        fromDate: filters.dateRange.from,
      }).andWhere('transaccion.fecha < :toDate', {
        toDate: filters.dateRange.toExclusive,
      });
    }

    if (filters.matchedAccounts.length > 0) {
      qb.andWhere('cuenta.id IN (:...accountIds)', {
        accountIds: filters.matchedAccounts.map((item) => item.id),
      });
    }

    if (filters.matchedSubcategories.length > 0) {
      qb.andWhere('subcategoria.id IN (:...subcategoriaIds)', {
        subcategoriaIds: filters.matchedSubcategories.map((item) => item.id),
      });
    } else if (filters.matchedCategories.length > 0) {
      qb.andWhere('categoria.id IN (:...categoriaIds)', {
        categoriaIds: filters.matchedCategories.map((item) => item.id),
      });
    }

    const rows = await qb
      .orderBy('transaccion.fecha', 'DESC')
      .addOrderBy('transaccion.id', 'DESC')
      .take(filters.hasStructuredFilters ? this.filteredTxLimit : this.txLimit)
      .getMany();

    const totalIngresos = rows
      .filter((item) => item.tipo === 'INGRESO')
      .reduce((acc, item) => acc + Number(item.monto ?? 0), 0);
    const totalEgresos = rows
      .filter((item) => item.tipo === 'EGRESO')
      .reduce((acc, item) => acc + Number(item.monto ?? 0), 0);

    return {
      mode: filters.hasStructuredFilters ? 'FILTERED' : 'RECENT',
      appliedFilters: {
        dateRange: filters.dateRange
          ? {
              label: filters.dateRange.label,
              from: this.toDateOnlyIso(filters.dateRange.from),
              to: this.toDateOnlyIso(
                new Date(filters.dateRange.toExclusive.getTime() - 1),
              ),
            }
          : null,
        cuentas: filters.matchedAccounts.map((item) => item.alias),
        categorias: filters.matchedCategories.map((item) => item.nombre),
        subcategorias: filters.matchedSubcategories.map((item) => item.nombre),
      },
      totals: {
        count: rows.length,
        ingresos: Number(totalIngresos.toFixed(2)),
        egresos: Number(totalEgresos.toFixed(2)),
        neto: Number((totalIngresos - totalEgresos).toFixed(2)),
      },
      topCategories: this.buildTopBreakdown(
        rows,
        (item) => item.categoria?.nombre ?? 'SIN_CATEGORIA',
      ),
      topAccounts: this.buildTopBreakdown(
        rows,
        (item) => item.cuenta?.alias ?? 'SIN_CUENTA',
      ),
      transactions: rows.map((item) => ({
        id: item.id,
        fecha: item.fecha instanceof Date ? item.fecha.toISOString() : item.fecha,
        tipo: item.tipo,
        concepto: item.concepto,
        monto: Number(item.monto),
        cuenta: item.cuenta?.alias ?? null,
        moneda: item.cuenta?.moneda?.codigo ?? null,
        categoria: item.categoria?.nombre ?? null,
        subcategoria: item.subcategoria?.nombre ?? null,
      })),
    };
  }

  private buildTopBreakdown(
    rows: Transaccion[],
    resolver: (item: Transaccion) => string,
  ): Array<{ label: string; total: number; count: number }> {
    const totals = new Map<string, { total: number; count: number }>();

    for (const item of rows) {
      const label = resolver(item);
      const current = totals.get(label) ?? { total: 0, count: 0 };
      current.total += Number(item.monto ?? 0);
      current.count += 1;
      totals.set(label, current);
    }

    return Array.from(totals.entries())
      .map(([label, value]) => ({
        label,
        total: Number(value.total.toFixed(2)),
        count: value.count,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }

  private extractAccountsFromSummary(summaryData: any): CuentaResumen[] {
    const cuentas = Array.isArray(summaryData?.cuentas) ? summaryData.cuentas : [];
    return cuentas.map((item: any) => ({
      id: Number(item.id),
      alias: String(item.alias ?? '').trim(),
      saldoActual: Number(item.saldoActual ?? 0),
      lineaCredito:
        item.lineaCredito !== null && item.lineaCredito !== undefined
          ? Number(item.lineaCredito)
          : null,
      monedaCodigo: String(item.monedaCodigo ?? '').trim(),
      tipoCuenta: String(item.tipoCuenta ?? '').trim(),
    }));
  }

  private buildCompactSummary(
    summaryData: Record<string, unknown> | null,
    includeAccounts: boolean,
  ): Record<string, unknown> | null {
    if (!summaryData) {
      return null;
    }

    const cuentas = Array.isArray(summaryData.cuentas) ? summaryData.cuentas : [];
    const tipos = Array.isArray(summaryData.saldoPorTipoCuenta)
      ? summaryData.saldoPorTipoCuenta
      : [];
    const tarjetas = Array.isArray(summaryData.resumenTarjetaCreditoPorMoneda)
      ? summaryData.resumenTarjetaCreditoPorMoneda
      : [];

    const compact: Record<string, unknown> = {
      hasAccounts: Boolean(summaryData.hasAccounts),
      totalAccounts: Number(summaryData.totalAccounts ?? 0),
      totalSaldoPen: Number(summaryData.totalSaldoPen ?? 0),
      totalSaldoUsd: Number(summaryData.totalSaldoUsd ?? 0),
      saldoPorTipoCuenta: tipos.slice(0, 8).map((item) => ({
        tipoCuenta: item.tipoCuenta,
        monedaCodigo: item.monedaCodigo,
        saldoTotal: Number(item.saldoTotal ?? 0),
      })),
      resumenTarjetaCreditoPorMoneda: tarjetas.slice(0, 4).map((item) => ({
        monedaCodigo: item.monedaCodigo,
        consumido: Number(item.consumido ?? 0),
        lineaCredito: Number(item.lineaCredito ?? 0),
        disponible: Number(item.disponible ?? 0),
      })),
    };

    if (includeAccounts) {
      compact.cuentas = cuentas.slice(0, 15).map((item) => ({
        id: item.id,
        alias: item.alias,
        monedaCodigo: item.monedaCodigo,
        tipoCuenta: item.tipoCuenta,
        saldoActual: Number(item.saldoActual ?? 0),
        lineaCredito:
          item.lineaCredito !== null ? Number(item.lineaCredito ?? 0) : null,
      }));
    }

    return compact;
  }

  private extractDateRange(question: string): DateRangeFilter | null {
    const explicitRange = this.extractExplicitDateRange(question);
    if (explicitRange) {
      return explicitRange;
    }

    const now = new Date();
    const today = this.startOfDay(now);

    if (question.includes('hoy')) {
      return this.buildDateRange(today, 1, 'HOY');
    }

    if (question.includes('ayer')) {
      const yesterday = this.addDays(today, -1);
      return this.buildDateRange(yesterday, 1, 'AYER');
    }

    const lastDaysMatch = question.match(/ultim(?:o|os|a|as)\s+(\d{1,3})\s+dias?/);
    if (lastDaysMatch) {
      const days = Number(lastDaysMatch[1]);
      if (Number.isFinite(days) && days > 0) {
        return {
          from: this.addDays(today, -(days - 1)),
          toExclusive: this.addDays(today, 1),
          label: `ULTIMOS_${days}_DIAS`,
        };
      }
    }

    if (question.includes('esta semana')) {
      const start = this.startOfWeek(today);
      return {
        from: start,
        toExclusive: this.addDays(today, 1),
        label: 'ESTA_SEMANA',
      };
    }

    if (question.includes('semana pasada')) {
      const thisWeekStart = this.startOfWeek(today);
      const lastWeekStart = this.addDays(thisWeekStart, -7);
      return {
        from: lastWeekStart,
        toExclusive: thisWeekStart,
        label: 'SEMANA_PASADA',
      };
    }

    if (question.includes('este mes')) {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        from: start,
        toExclusive: this.addDays(today, 1),
        label: 'ESTE_MES',
      };
    }

    if (question.includes('mes pasado')) {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        from: start,
        toExclusive: end,
        label: 'MES_PASADO',
      };
    }

    const monthMatch = question.match(
      /\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\s+(?:de\s+)?(20\d{2})\b/,
    );
    if (monthMatch) {
      const month = this.resolveMonthNumber(monthMatch[1]);
      const year = Number(monthMatch[2]);
      if (month !== null) {
        return {
          from: new Date(year, month, 1),
          toExclusive: new Date(year, month + 1, 1),
          label: `${monthMatch[1].toUpperCase()}_${year}`,
        };
      }
    }

    return null;
  }

  private extractExplicitDateRange(question: string): DateRangeFilter | null {
    const rangePatterns = [
      /(?:desde|de)\s+(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})\s+(?:hasta|a)\s+(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})/,
      /entre\s+(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})\s+y\s+(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})/,
    ];

    for (const pattern of rangePatterns) {
      const match = question.match(pattern);
      if (!match) {
        continue;
      }
      const from = this.parseDateToken(match[1]);
      const to = this.parseDateToken(match[2]);
      if (!from || !to) {
        continue;
      }
      const start = from <= to ? from : to;
      const end = from <= to ? to : from;
      return {
        from: start,
        toExclusive: this.addDays(end, 1),
        label: 'RANGO_EXPLICITO',
      };
    }

    const singleDateMatch = question.match(
      /\b(20\d{2}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})\b/,
    );
    if (!singleDateMatch) {
      return null;
    }

    const day = this.parseDateToken(singleDateMatch[1]);
    if (!day) {
      return null;
    }

    return {
      from: day,
      toExclusive: this.addDays(day, 1),
      label: 'FECHA_EXPLICITA',
    };
  }

  private parseDateToken(token: string): Date | null {
    const raw = token.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const [year, month, day] = raw.split('-').map(Number);
      return new Date(year, month - 1, day);
    }

    const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!slashMatch) {
      return null;
    }

    const day = Number(slashMatch[1]);
    const month = Number(slashMatch[2]);
    const year = Number(slashMatch[3]);
    return new Date(year, month - 1, day);
  }

  private resolveMonthNumber(monthName: string): number | null {
    const months: Record<string, number> = {
      enero: 0,
      febrero: 1,
      marzo: 2,
      abril: 3,
      mayo: 4,
      junio: 5,
      julio: 6,
      agosto: 7,
      septiembre: 8,
      setiembre: 8,
      octubre: 9,
      noviembre: 10,
      diciembre: 11,
    };

    return months[monthName] ?? null;
  }

  private containsPhrase(question: string, value: string): boolean {
    const normalizedValue = this.normalize(value);
    return normalizedValue.length >= 3 && question.includes(normalizedValue);
  }

  private buildDateRange(
    from: Date,
    days: number,
    label: string,
  ): DateRangeFilter {
    return {
      from,
      toExclusive: this.addDays(from, days),
      label,
    };
  }

  private startOfDay(value: Date): Date {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  private startOfWeek(value: Date): Date {
    const day = value.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    return this.addDays(this.startOfDay(value), diff);
  }

  private addDays(value: Date, days: number): Date {
    const next = new Date(value);
    next.setDate(next.getDate() + days);
    return this.startOfDay(next);
  }

  private toDateOnlyIso(value: Date): string {
    return new Date(value.getTime() - value.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
  }

  private normalize(value: string): string {
    return (value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .trim();
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
}
