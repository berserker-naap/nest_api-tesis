import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StatusResponse } from 'src/common/dto/response.dto';
import { formatDateOnly, parseDateOnly } from 'src/common/utils/date-only.util';
import { Usuario } from 'src/security/entities/usuario.entity';
import { Between, IsNull, Repository } from 'typeorm';
import {
  AbonarMetaAhorroDto,
  CrearMetaAhorroDto,
  CrearPagoRecurrenteDto,
  PeriodoMonedaQueryDto,
} from '../dto/planificacion-financiera.dto';
import { CategoriaFinance } from '../entities/categoria-finance.entity';
import { Cuenta } from '../entities/cuenta.entity';
import { MetaAhorro } from '../entities/meta-ahorro.entity';
import { Moneda } from '../entities/moneda.entity';
import { PagoRecurrente } from '../entities/pago-recurrente.entity';
import { Transaccion } from '../entities/transaccion.entity';
import { TipoCategoriaFinance } from '../enum/categoria-finance.enum';
import { TipoTransaccion } from '../enum/transaccion.enum';
import { TransaccionFinanceService } from './transaccion-finance.service';

@Injectable()
export class PlanificacionFinancieraService {
  constructor(
    @InjectRepository(MetaAhorro)
    private readonly metaRepository: Repository<MetaAhorro>,
    @InjectRepository(PagoRecurrente)
    private readonly recurrenteRepository: Repository<PagoRecurrente>,
    @InjectRepository(Cuenta)
    private readonly cuentaRepository: Repository<Cuenta>,
    @InjectRepository(CategoriaFinance)
    private readonly categoriaRepository: Repository<CategoriaFinance>,
    @InjectRepository(Moneda)
    private readonly monedaRepository: Repository<Moneda>,
    @InjectRepository(Transaccion)
    private readonly transaccionRepository: Repository<Transaccion>,
    private readonly transaccionService: TransaccionFinanceService,
  ) {}

  async listGoals(usuario: Usuario): Promise<StatusResponse<any>> {
    try {
      const metas = await this.metaRepository.find({
        where: { usuario: { id: usuario.id }, activo: true, eliminado: false },
        relations: ['moneda', 'cuenta'],
        order: { fechaObjetivo: 'ASC', id: 'DESC' },
      });
      return new StatusResponse(true, 200, 'Metas obtenidas', metas.map((meta) => this.goalResponse(meta)));
    } catch (error) {
      return this.failure(error, 'No se pudieron obtener las metas');
    }
  }

  async createGoal(dto: CrearMetaAhorroDto, usuario: Usuario, ip: string): Promise<StatusResponse<any>> {
    try {
      const moneda = await this.findCurrency(dto.monedaCodigo, usuario.id);
      const cuenta = dto.idCuenta ? await this.findAccount(dto.idCuenta, usuario.id) : null;
      if (cuenta && cuenta.moneda.id !== moneda.id) {
        throw new BadRequestException('La cuenta y la meta deben usar la misma moneda');
      }
      const montoObjetivo = Number(dto.montoObjetivo);
      const montoInicial = Number(dto.montoInicial ?? 0);
      if (montoInicial > montoObjetivo) {
        throw new BadRequestException('El avance inicial no puede superar el objetivo');
      }
      const fechaObjetivo = parseDateOnly(dto.fechaObjetivo);
      if (fechaObjetivo < parseDateOnly(formatDateOnly(new Date())!)) {
        throw new BadRequestException('La fecha objetivo no puede estar en el pasado');
      }
      const meta = this.metaRepository.create({
        usuario,
        moneda,
        cuenta,
        nombre: dto.nombre.trim(),
        descripcion: dto.descripcion?.trim() || null,
        montoObjetivo,
        montoAhorrado: montoInicial,
        fechaObjetivo,
        usuarioRegistro: usuario.login,
        ipRegistro: ip,
      });
      const saved = await this.metaRepository.save(meta);
      return new StatusResponse(true, 201, 'Meta creada', this.goalResponse(saved));
    } catch (error) {
      return this.failure(error, 'No se pudo crear la meta');
    }
  }

  async contributeGoal(id: number, dto: AbonarMetaAhorroDto, usuario: Usuario, ip: string): Promise<StatusResponse<any>> {
    try {
      const meta = await this.findGoal(id, usuario.id);
      meta.montoAhorrado = Number(Math.min(Number(meta.montoObjetivo), Number(meta.montoAhorrado) + Number(dto.monto)).toFixed(2));
      meta.usuarioModificacion = usuario.login;
      meta.ipModificacion = ip;
      meta.fechaModificacion = new Date();
      return new StatusResponse(true, 200, 'Progreso actualizado', this.goalResponse(await this.metaRepository.save(meta)));
    } catch (error) {
      return this.failure(error, 'No se pudo actualizar la meta');
    }
  }

  async removeGoal(id: number, usuario: Usuario, ip: string): Promise<StatusResponse<null>> {
    try {
      const meta = await this.findGoal(id, usuario.id);
      this.softDelete(meta, usuario, ip);
      await this.metaRepository.save(meta);
      return new StatusResponse(true, 200, 'Meta eliminada', null);
    } catch (error) {
      return this.failure(error, 'No se pudo eliminar la meta');
    }
  }

  async listRecurring(usuario: Usuario): Promise<StatusResponse<any>> {
    try {
      const items = await this.recurrenteRepository.find({
        where: { usuario: { id: usuario.id }, activo: true, eliminado: false },
        relations: ['cuenta', 'cuenta.moneda', 'categoria'],
        order: { proximaFecha: 'ASC', id: 'DESC' },
      });
      return new StatusResponse(true, 200, 'Pagos recurrentes obtenidos', items.map((item) => this.recurringResponse(item)));
    } catch (error) {
      return this.failure(error, 'No se pudieron obtener los pagos recurrentes');
    }
  }

  async createRecurring(dto: CrearPagoRecurrenteDto, usuario: Usuario, ip: string): Promise<StatusResponse<any>> {
    try {
      const cuenta = await this.findAccount(dto.idCuenta, usuario.id);
      const categoria = await this.findExpenseCategory(dto.idCategoria, usuario.id);
      const item = this.recurrenteRepository.create({
        usuario,
        cuenta,
        categoria,
        concepto: dto.concepto.trim(),
        monto: Number(dto.monto),
        frecuencia: dto.frecuencia,
        proximaFecha: parseDateOnly(dto.proximaFecha),
        diasRecordatorio: dto.diasRecordatorio,
        nota: dto.nota?.trim() || null,
        usuarioRegistro: usuario.login,
        ipRegistro: ip,
      });
      return new StatusResponse(true, 201, 'Pago recurrente creado', this.recurringResponse(await this.recurrenteRepository.save(item)));
    } catch (error) {
      return this.failure(error, 'No se pudo crear el pago recurrente');
    }
  }

  async registerRecurring(id: number, usuario: Usuario, ip: string): Promise<StatusResponse<any>> {
    try {
      const item = await this.findRecurring(id, usuario.id);
      const transaction = await this.transaccionService.createEgreso(
        {
          idCuenta: item.cuenta.id,
          idCategoria: item.categoria.id,
          monto: Number(item.monto),
          concepto: item.concepto,
          nota: item.nota,
          fecha: formatDateOnly(item.proximaFecha) ?? undefined,
        },
        usuario,
        ip,
      );
      if (!transaction.ok) return transaction;
      item.proximaFecha = this.advanceDate(item.proximaFecha, item.frecuencia);
      item.usuarioModificacion = usuario.login;
      item.ipModificacion = ip;
      item.fechaModificacion = new Date();
      const saved = await this.recurrenteRepository.save(item);
      return new StatusResponse(true, 200, 'Pago registrado y siguiente fecha programada', this.recurringResponse(saved));
    } catch (error) {
      return this.failure(error, 'No se pudo registrar el pago recurrente');
    }
  }

  async removeRecurring(id: number, usuario: Usuario, ip: string): Promise<StatusResponse<null>> {
    try {
      const item = await this.findRecurring(id, usuario.id);
      this.softDelete(item, usuario, ip);
      await this.recurrenteRepository.save(item);
      return new StatusResponse(true, 200, 'Pago recurrente eliminado', null);
    } catch (error) {
      return this.failure(error, 'No se pudo eliminar el pago recurrente');
    }
  }

  async monthlyReport(query: PeriodoMonedaQueryDto, usuario: Usuario): Promise<StatusResponse<any>> {
    try {
      const periodo = query.periodo ?? new Date().toISOString().slice(0, 7);
      const monedaCodigo = (query.monedaCodigo ?? 'PEN').toUpperCase();
      const [start, end] = this.periodRange(periodo);
      const rows = await this.transaccionRepository.find({
        where: {
          usuario: { id: usuario.id },
          fecha: Between(start, end),
          activo: true,
          eliminado: false,
        },
        relations: ['cuenta', 'cuenta.moneda', 'categoria'],
        order: { fecha: 'DESC', id: 'DESC' },
      });
      const transactions = rows.filter((item) => item.cuenta.moneda.codigo === monedaCodigo);
      const ingresos = transactions.filter((item) => item.tipo === TipoTransaccion.INGRESO);
      const egresos = transactions.filter((item) => item.tipo === TipoTransaccion.EGRESO);
      const totalIngresos = this.sum(ingresos);
      const totalEgresos = this.sum(egresos);
      return new StatusResponse(true, 200, 'Reporte mensual obtenido', {
        periodo,
        monedaCodigo,
        monedaSimbolo: transactions[0]?.cuenta.moneda.simbolo ?? (monedaCodigo === 'PEN' ? 'S/' : '$'),
        totalIngresos,
        totalEgresos,
        balance: Number((totalIngresos - totalEgresos).toFixed(2)),
        categorias: this.groupAmounts(egresos, (item) => item.categoria?.nombre ?? 'Sin categoria'),
        cuentas: this.groupAmounts(transactions, (item) => item.cuenta.alias),
        movimientos: transactions.map((item) => ({
          id: item.id,
          fecha: item.fecha,
          tipo: item.tipo,
          concepto: item.concepto,
          categoriaNombre: item.categoria?.nombre ?? null,
          cuentaAlias: item.cuenta.alias,
          monto: Number(item.monto),
        })),
      });
    } catch (error) {
      return this.failure(error, 'No se pudo generar el reporte mensual');
    }
  }

  private async findGoal(id: number, idUsuario: number): Promise<MetaAhorro> {
    const item = await this.metaRepository.findOne({
      where: { id, usuario: { id: idUsuario }, activo: true, eliminado: false },
      relations: ['moneda', 'cuenta'],
    });
    if (!item) throw new NotFoundException('La meta no existe');
    return item;
  }

  private async findRecurring(id: number, idUsuario: number): Promise<PagoRecurrente> {
    const item = await this.recurrenteRepository.findOne({
      where: { id, usuario: { id: idUsuario }, activo: true, eliminado: false },
      relations: ['cuenta', 'cuenta.moneda', 'categoria'],
    });
    if (!item) throw new NotFoundException('El pago recurrente no existe');
    return item;
  }

  private async findAccount(id: number, idUsuario: number): Promise<Cuenta> {
    const cuenta = await this.cuentaRepository.findOne({
      where: { id, usuario: { id: idUsuario }, activo: true, eliminado: false },
      relations: ['moneda'],
    });
    if (!cuenta) throw new NotFoundException('La cuenta no existe');
    return cuenta;
  }

  private async findCurrency(code: string, idUsuario: number): Promise<Moneda> {
    const normalized = code.trim().toUpperCase();
    const moneda = await this.monedaRepository.findOne({
      where: [
        { codigo: normalized, activo: true, eliminado: false, usuario: IsNull() },
        { codigo: normalized, activo: true, eliminado: false, usuario: { id: idUsuario } },
      ],
    });
    if (!moneda) throw new NotFoundException('La moneda no existe');
    return moneda;
  }

  private async findExpenseCategory(id: number, idUsuario: number): Promise<CategoriaFinance> {
    const common = { id, tipo: TipoCategoriaFinance.EGRESO, activo: true, eliminado: false };
    const category = await this.categoriaRepository.findOne({
      where: [
        { ...common, usuario: IsNull() },
        { ...common, usuario: { id: idUsuario } },
      ],
    });
    if (!category) throw new NotFoundException('La categoria de egreso no existe');
    return category;
  }

  private goalResponse(meta: MetaAhorro): Record<string, unknown> {
    const objective = Number(meta.montoObjetivo);
    const saved = Number(meta.montoAhorrado);
    return {
      id: meta.id,
      nombre: meta.nombre,
      descripcion: meta.descripcion,
      montoObjetivo: objective,
      montoAhorrado: saved,
      porcentaje: objective > 0 ? Number(Math.min((saved / objective) * 100, 100).toFixed(2)) : 0,
      fechaObjetivo: formatDateOnly(meta.fechaObjetivo),
      completada: saved >= objective,
      monedaCodigo: meta.moneda.codigo,
      monedaSimbolo: meta.moneda.simbolo,
      idCuenta: meta.cuenta?.id ?? null,
      cuentaAlias: meta.cuenta?.alias ?? null,
    };
  }

  private recurringResponse(item: PagoRecurrente): Record<string, unknown> {
    const next = parseDateOnly(formatDateOnly(item.proximaFecha)!);
    const today = parseDateOnly(formatDateOnly(new Date())!);
    const days = Math.ceil((next.getTime() - today.getTime()) / 86400000);
    return {
      id: item.id,
      concepto: item.concepto,
      monto: Number(item.monto),
      frecuencia: item.frecuencia,
      proximaFecha: formatDateOnly(item.proximaFecha),
      diasRecordatorio: item.diasRecordatorio,
      diasRestantes: days,
      requiereAtencion: days <= item.diasRecordatorio,
      nota: item.nota,
      idCuenta: item.cuenta.id,
      cuentaAlias: item.cuenta.alias,
      monedaCodigo: item.cuenta.moneda.codigo,
      monedaSimbolo: item.cuenta.moneda.simbolo,
      idCategoria: item.categoria.id,
      categoriaNombre: item.categoria.nombre,
    };
  }

  private advanceDate(value: Date, frequency: PagoRecurrente['frecuencia']): Date {
    const date = parseDateOnly(formatDateOnly(value)!);
    if (frequency === 'SEMANAL') date.setDate(date.getDate() + 7);
    else if (frequency === 'ANUAL') date.setFullYear(date.getFullYear() + 1);
    else {
      const day = date.getDate();
      date.setDate(1);
      date.setMonth(date.getMonth() + 1);
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      date.setDate(Math.min(day, lastDay));
    }
    return date;
  }

  private periodRange(period: string): [Date, Date] {
    const [year, month] = period.split('-').map(Number);
    return [new Date(year, month - 1, 1), new Date(year, month, 0, 23, 59, 59, 999)];
  }

  private sum(items: Transaccion[]): number {
    return Number(items.reduce((total, item) => total + Number(item.monto), 0).toFixed(2));
  }

  private groupAmounts(items: Transaccion[], label: (item: Transaccion) => string): Array<{ nombre: string; monto: number }> {
    const grouped = new Map<string, number>();
    for (const item of items) grouped.set(label(item), (grouped.get(label(item)) ?? 0) + Number(item.monto));
    return Array.from(grouped.entries())
      .map(([nombre, monto]) => ({ nombre, monto: Number(monto.toFixed(2)) }))
      .sort((a, b) => b.monto - a.monto);
  }

  private softDelete(item: MetaAhorro | PagoRecurrente, usuario: Usuario, ip: string): void {
    item.activo = false;
    item.eliminado = true;
    item.usuarioEliminacion = usuario.login;
    item.ipEliminacion = ip;
    item.fechaEliminacion = new Date();
  }

  private failure<T>(error: unknown, fallback: string): StatusResponse<T> {
    const message = error instanceof BadRequestException || error instanceof NotFoundException ? error.message : fallback;
    return new StatusResponse<T>(false, error instanceof NotFoundException ? 404 : 400, message);
  }
}
