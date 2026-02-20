import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BalanceAccountService } from 'src/finance/services/balance-account.service';
import { TipoCambioDataService } from 'src/finance/services/tipo-cambio-data.service';
import { Transaccion } from 'src/finance/entities/transaccion.entity';

@Injectable()
export class AssistantFinanceToolsService {
  private readonly txLimit = this.toBoundedNumber(
    process.env.ASSISTANT_RECENT_TX_LIMIT,
    20,
    5,
    50,
  );

  constructor(
    private readonly balanceAccountService: BalanceAccountService,
    private readonly tipoCambioDataService: TipoCambioDataService,
    @InjectRepository(Transaccion)
    private readonly transaccionRepository: Repository<Transaccion>,
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

    const shouldIncludeTx =
      question.includes('transaccion') ||
      question.includes('gasto') ||
      question.includes('egreso') ||
      question.includes('ingreso') ||
      question.includes('movimiento') ||
      question.includes('categoria') ||
      question.includes('transferencia');

    const context: Record<string, unknown> = {
      summary: this.buildCompactSummary(summaryData, shouldIncludeAccountLists),
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
      const tx = await this.transaccionRepository
        .createQueryBuilder('transaccion')
        .innerJoin('transaccion.usuario', 'usuario')
        .leftJoinAndSelect('transaccion.categoria', 'categoria')
        .leftJoinAndSelect('transaccion.subcategoria', 'subcategoria')
        .leftJoinAndSelect('transaccion.cuenta', 'cuenta')
        .leftJoinAndSelect('cuenta.moneda', 'moneda')
        .where('usuario.id = :idUsuario', { idUsuario })
        .andWhere('transaccion.activo = :activo', { activo: true })
        .andWhere('transaccion.eliminado = :eliminado', { eliminado: false })
        .orderBy('transaccion.fecha', 'DESC')
        .addOrderBy('transaccion.id', 'DESC')
        .take(this.txLimit)
        .getMany();

      context.recentTransactions = tx.map((item) => ({
        id: item.id,
        fecha: item.fecha instanceof Date ? item.fecha.toISOString() : item.fecha,
        tipo: item.tipo,
        concepto: item.concepto,
        monto: Number(item.monto),
        moneda: item.cuenta?.moneda?.codigo ?? null,
        categoria: item.categoria?.nombre ?? null,
        subcategoria: item.subcategoria?.nombre ?? null,
      }));

      toolsUsed.push('recent_transactions');
    }

    return { toolsUsed, context };
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
      compact.cuentas = cuentas.slice(0, 10).map((item) => ({
        id: item.id,
        alias: item.alias,
        monedaCodigo: item.monedaCodigo,
        tipoCuenta: item.tipoCuenta,
        saldoActual: Number(item.saldoActual ?? 0),
        lineaCredito: item.lineaCredito !== null ? Number(item.lineaCredito ?? 0) : null,
      }));
    }

    return compact;
  }

  private normalize(value: string): string {
    return (value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
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
