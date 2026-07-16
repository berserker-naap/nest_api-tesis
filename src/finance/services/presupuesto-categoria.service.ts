import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StatusResponse } from 'src/common/dto/response.dto';
import { Usuario } from 'src/security/entities/usuario.entity';
import { IsNull, Repository } from 'typeorm';
import { GuardarPresupuestoCategoriaDto, ListarPresupuestosQueryDto } from '../dto/presupuesto-categoria.dto';
import { CategoriaFinance } from '../entities/categoria-finance.entity';
import { Moneda } from '../entities/moneda.entity';
import { PresupuestoCategoria } from '../entities/presupuesto-categoria.entity';
import { TipoCategoriaFinance } from '../enum/categoria-finance.enum';
import { Transaccion } from '../entities/transaccion.entity';
import { Between } from 'typeorm';
import { TipoTransaccion } from '../enum/transaccion.enum';

@Injectable()
export class PresupuestoCategoriaService {
  constructor(
    @InjectRepository(PresupuestoCategoria)
    private readonly presupuestoRepository: Repository<PresupuestoCategoria>,
    @InjectRepository(CategoriaFinance)
    private readonly categoriaRepository: Repository<CategoriaFinance>,
    @InjectRepository(Moneda)
    private readonly monedaRepository: Repository<Moneda>,
    @InjectRepository(Transaccion)
    private readonly transaccionRepository: Repository<Transaccion>,
  ) {}

  async findAll(
    query: ListarPresupuestosQueryDto,
    usuario: Usuario,
  ): Promise<StatusResponse<any>> {
    try {
      const periodo = query.periodo ?? new Date().toISOString().slice(0, 7);
      const monedaCodigo = (query.monedaCodigo ?? 'PEN').toUpperCase();
      const [year, month] = periodo.split('-').map(Number);
      const presupuestos = await this.presupuestoRepository.find({
        where: {
          usuario: { id: usuario.id },
          periodo,
          activo: true,
          eliminado: false,
        },
        relations: ['categoria', 'moneda'],
        order: { id: 'DESC' },
      });
      const rows = await this.transaccionRepository.find({
        where: {
          usuario: { id: usuario.id },
          tipo: TipoTransaccion.EGRESO,
          fecha: Between(
            new Date(year, month - 1, 1),
            new Date(year, month, 0, 23, 59, 59, 999),
          ),
          activo: true,
          eliminado: false,
        },
        relations: ['categoria', 'cuenta', 'cuenta.moneda'],
      });
      const spent = new Map<number, number>();
      for (const item of rows) {
        if (!item.categoria || item.cuenta.moneda.codigo !== monedaCodigo) continue;
        spent.set(item.categoria.id, (spent.get(item.categoria.id) ?? 0) + Number(item.monto));
      }
      const items = presupuestos
        .filter((item) => item.moneda.codigo === monedaCodigo)
        .map((item) => {
          const gastado = Number((spent.get(item.categoria.id) ?? 0).toFixed(2));
          const limite = Number(item.montoLimite);
          return {
            id: item.id,
            idCategoria: item.categoria.id,
            categoriaNombre: item.categoria.nombre,
            periodo: item.periodo,
            monedaCodigo: item.moneda.codigo,
            monedaSimbolo: item.moneda.simbolo,
            montoLimite: limite,
            montoGastado: gastado,
            montoDisponible: Number((limite - gastado).toFixed(2)),
            porcentaje: limite > 0 ? Number(Math.min((gastado / limite) * 100, 999).toFixed(2)) : 0,
          };
        });
      return new StatusResponse(true, 200, 'Presupuestos obtenidos', items);
    } catch (error) {
      console.error('No se pudieron obtener los presupuestos', error);
      return new StatusResponse(false, 500, 'No se pudieron obtener los presupuestos', null);
    }
  }

  async save(
    dto: GuardarPresupuestoCategoriaDto,
    usuario: Usuario,
    ip: string,
  ): Promise<StatusResponse<any>> {
    try {
      const categoria = await this.categoriaRepository.findOne({
        where: [
          {
            id: dto.idCategoria,
            tipo: TipoCategoriaFinance.EGRESO,
            activo: true,
            eliminado: false,
            usuario: IsNull(),
          },
          {
            id: dto.idCategoria,
            tipo: TipoCategoriaFinance.EGRESO,
            activo: true,
            eliminado: false,
            usuario: { id: usuario.id },
          },
        ],
      });
      if (!categoria) throw new BadRequestException('Selecciona una categoría de egreso válida');

      const moneda = await this.monedaRepository.findOne({
        where: {
          codigo: dto.monedaCodigo.trim().toUpperCase(),
          activo: true,
          eliminado: false,
        },
      });
      if (!moneda) throw new NotFoundException('No se encontró la moneda');

      let presupuesto = await this.presupuestoRepository.findOne({
        where: {
          usuario: { id: usuario.id },
          categoria: { id: categoria.id },
          moneda: { id: moneda.id },
          periodo: dto.periodo,
        },
        relations: ['usuario', 'categoria', 'moneda'],
      });

      if (presupuesto) {
        presupuesto.montoLimite = Number(dto.montoLimite);
        presupuesto.activo = true;
        presupuesto.eliminado = false;
        presupuesto.usuarioModificacion = usuario.login;
        presupuesto.ipModificacion = ip;
        presupuesto.fechaModificacion = new Date();
      } else {
        presupuesto = this.presupuestoRepository.create({
          usuario,
          categoria,
          moneda,
          periodo: dto.periodo,
          montoLimite: Number(dto.montoLimite),
          usuarioRegistro: usuario.login,
          ipRegistro: ip,
        });
      }

      const saved = await this.presupuestoRepository.save(presupuesto);
      return new StatusResponse(true, 200, 'Presupuesto guardado', {
        id: saved.id,
        idCategoria: categoria.id,
        categoriaNombre: categoria.nombre,
        periodo: saved.periodo,
        monedaCodigo: moneda.codigo,
        monedaSimbolo: moneda.simbolo,
        montoLimite: Number(saved.montoLimite),
      });
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        return new StatusResponse(false, error.getStatus(), error.message, null);
      }
      console.error('No se pudo guardar el presupuesto', error);
      return new StatusResponse(false, 500, 'No se pudo guardar el presupuesto', null);
    }
  }

  async remove(id: number, usuario: Usuario, ip: string): Promise<StatusResponse<null>> {
    try {
      const item = await this.presupuestoRepository.findOne({
        where: { id, usuario: { id: usuario.id }, activo: true, eliminado: false },
      });
      if (!item) throw new NotFoundException('El presupuesto no existe');
      item.activo = false;
      item.eliminado = true;
      item.usuarioEliminacion = usuario.login;
      item.ipEliminacion = ip;
      item.fechaEliminacion = new Date();
      await this.presupuestoRepository.save(item);
      return new StatusResponse(true, 200, 'Presupuesto eliminado', null);
    } catch (error) {
      if (error instanceof NotFoundException) {
        return new StatusResponse(false, 404, error.message, null);
      }
      return new StatusResponse(false, 500, 'No se pudo eliminar el presupuesto', null);
    }
  }
}
