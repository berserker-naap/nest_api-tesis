import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StatusResponse } from 'src/common/dto/response.dto';
import { parseDateOnly } from 'src/common/utils/date-only.util';
import { Usuario } from 'src/security/entities/usuario.entity';
import { DataSource, Repository } from 'typeorm';
import {
  CrearEgresoDto,
  FiltroTransaccionesDto,
  CrearIngresoDto,
  CrearTransferenciaDto,
  CrearTransaccionBaseDto,
} from '../dto/transaccion.dto';
import { TipoCategoriaFinance } from '../enum/categoria-finance.enum';
import {
  OrigenTransaccion,
  OrigenTransaccionOperativa,
  TipoTransaccion,
  TipoTransaccionOperativa,
} from '../enum/transaccion.enum';
import { CategoriaFinance } from '../entities/categoria-finance.entity';
import { Cuenta } from '../entities/cuenta.entity';
import { SubcategoriaFinance } from '../entities/subcategoria-finance.entity';
import { Transaccion } from '../entities/transaccion.entity';
import { CategoriaFinanceService } from './categoria-finance.service';

@Injectable()
export class TransaccionFinanceService {
  constructor(
    @InjectRepository(Transaccion)
    private readonly transaccionRepository: Repository<Transaccion>,
    @InjectRepository(Cuenta)
    private readonly cuentaRepository: Repository<Cuenta>,
    @InjectRepository(CategoriaFinance)
    private readonly categoriaRepository: Repository<CategoriaFinance>,
    @InjectRepository(SubcategoriaFinance)
    private readonly subcategoriaRepository: Repository<SubcategoriaFinance>,
    private readonly dataSource: DataSource,
    private readonly categoriaFinanceService: CategoriaFinanceService,
  ) {}

  async createEgreso(
    dto: CrearEgresoDto,
    usuario: Usuario,
    ip: string,
  ): Promise<StatusResponse<any>> {
    return this.createTransaction(
      dto,
      usuario,
      ip,
      TipoTransaccion.EGRESO,
      OrigenTransaccion.MANUAL,
    );
  }

  async createIngreso(
    dto: CrearIngresoDto,
    usuario: Usuario,
    ip: string,
  ): Promise<StatusResponse<any>> {
    return this.createTransaction(
      dto,
      usuario,
      ip,
      TipoTransaccion.INGRESO,
      OrigenTransaccion.MANUAL,
    );
  }

  async createTransferencia(
    dto: CrearTransferenciaDto,
    usuario: Usuario,
    ip: string,
  ): Promise<StatusResponse<any>> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (!dto.monto || dto.monto <= 0) {
        throw new BadRequestException('El monto debe ser mayor a 0');
      }

      if (dto.idCuentaOrigen === dto.idCuentaDestino) {
        throw new BadRequestException(
          'La cuenta origen y destino deben ser diferentes',
        );
      }

      const cuentaOrigen = await queryRunner.manager.findOne(Cuenta, {
        where: {
          id: dto.idCuentaOrigen,
          usuario: { id: usuario.id },
          activo: true,
          eliminado: false,
        },
        relations: ['usuario'],
      });
      if (!cuentaOrigen) {
        throw new NotFoundException(
          'La cuenta origen no existe o no pertenece al usuario',
        );
      }

      const cuentaDestino = await queryRunner.manager.findOne(Cuenta, {
        where: {
          id: dto.idCuentaDestino,
          usuario: { id: usuario.id },
          activo: true,
          eliminado: false,
        },
        relations: ['usuario'],
      });
      if (!cuentaDestino) {
        throw new NotFoundException(
          'La cuenta destino no existe o no pertenece al usuario',
        );
      }

      const fechaTransaccion = this.resolveTransactionDate(dto.fecha);
      const monto = Number(dto.monto);
      const concepto = dto.concepto.trim();
      const nota = dto.nota?.trim() || null;

      const salida = queryRunner.manager.create(Transaccion, {
        usuario,
        cuenta: cuentaOrigen,
        tipo: TipoTransaccion.EGRESO,
        categoria: null,
        subcategoria: null,
        fecha: fechaTransaccion,
        concepto,
        descripcion: `Transferencia a ${cuentaDestino.alias}`,
        monto,
        comprobanteUrl: null,
        nota,
        externalMessageId: null,
        origen: OrigenTransaccion.MANUAL,
        usuarioRegistro: usuario.login,
        ipRegistro: ip,
      });

      const entrada = queryRunner.manager.create(Transaccion, {
        usuario,
        cuenta: cuentaDestino,
        tipo: TipoTransaccion.INGRESO,
        categoria: null,
        subcategoria: null,
        fecha: fechaTransaccion,
        concepto,
        descripcion: `Transferencia desde ${cuentaOrigen.alias}`,
        monto,
        comprobanteUrl: null,
        nota,
        externalMessageId: null,
        origen: OrigenTransaccion.MANUAL,
        usuarioRegistro: usuario.login,
        ipRegistro: ip,
      });

      const savedSalida = await queryRunner.manager.save(Transaccion, salida);
      const savedEntrada = await queryRunner.manager.save(Transaccion, entrada);

      cuentaOrigen.saldoActual = Number(
        (Number(cuentaOrigen.saldoActual) - monto).toFixed(2),
      );
      cuentaOrigen.usuarioModificacion = usuario.login;
      cuentaOrigen.ipModificacion = ip;
      cuentaOrigen.fechaModificacion = new Date();

      cuentaDestino.saldoActual = Number(
        (Number(cuentaDestino.saldoActual) + monto).toFixed(2),
      );
      cuentaDestino.usuarioModificacion = usuario.login;
      cuentaDestino.ipModificacion = ip;
      cuentaDestino.fechaModificacion = new Date();

      await queryRunner.manager.save(Cuenta, cuentaOrigen);
      await queryRunner.manager.save(Cuenta, cuentaDestino);

      await queryRunner.commitTransaction();

      return new StatusResponse(true, 201, 'Transferencia registrada', {
        idTransaccionSalida: savedSalida.id,
        idTransaccionEntrada: savedEntrada.id,
        idCuentaOrigen: cuentaOrigen.id,
        idCuentaDestino: cuentaDestino.id,
        monto,
        fecha: fechaTransaccion,
        saldoOrigen: Number(cuentaOrigen.saldoActual),
        saldoDestino: Number(cuentaDestino.saldoActual),
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Error al registrar transferencia:', error);
      return new StatusResponse(
        false,
        500,
        'Error al registrar transferencia',
        error,
      );
    } finally {
      await queryRunner.release();
    }
  }

  async createFromWhatsapp(
    dto: CrearTransaccionBaseDto,
    usuario: Usuario,
    tipo: TipoTransaccionOperativa,
    externalMessageId: string,
    ip: string,
  ): Promise<StatusResponse<any>> {
    return this.createTransaction(
      dto,
      usuario,
      ip,
      tipo,
      OrigenTransaccion.IMPORTACION,
      externalMessageId,
    );
  }

  async findAll(
    query: FiltroTransaccionesDto,
    usuario: Usuario,
  ): Promise<StatusResponse<any>> {
    const limit = query.limit ?? 80;
    const qb = this.transaccionRepository
      .createQueryBuilder('transaccion')
      .innerJoinAndSelect('transaccion.usuario', 'usuario')
      .innerJoinAndSelect('transaccion.cuenta', 'cuenta')
      .innerJoinAndSelect('cuenta.moneda', 'moneda')
      .leftJoinAndSelect('cuenta.entidadFinanciera', 'entidadFinanciera')
      .leftJoinAndSelect('transaccion.categoria', 'categoria')
      .leftJoinAndSelect('transaccion.subcategoria', 'subcategoria')
      .where('usuario.id = :idUsuario', { idUsuario: usuario.id })
      .andWhere('transaccion.eliminado = :eliminado', { eliminado: false })
      .andWhere('transaccion.activo = :activo', { activo: true });

    if (query.tipo) {
      qb.andWhere('transaccion.tipo = :tipo', { tipo: query.tipo });
    }

    const search = (query.search ?? '').trim();
    if (search) {
      qb.andWhere(
        `(
          transaccion.concepto LIKE :search OR
          transaccion.nota LIKE :search OR
          categoria.nombre LIKE :search OR
          subcategoria.nombre LIKE :search OR
          cuenta.alias LIKE :search OR
          entidadFinanciera.nombre LIKE :search
        )`,
        { search: `%${search}%` },
      );
    }

    const transacciones = await qb
      .orderBy('transaccion.fecha', 'DESC')
      .addOrderBy('transaccion.id', 'DESC')
      .take(limit)
      .getMany();

    const data = transacciones.map((item) => ({
      id: item.id,
      fecha: item.fecha,
      tipo: item.tipo,
      monto: Number(item.monto),
      concepto: item.concepto,
      nota: item.nota,
      categoriaNombre: item.categoria?.nombre ?? null,
      subcategoriaNombre: item.subcategoria?.nombre ?? null,
      cuentaAlias: item.cuenta.alias,
      entidadFinancieraNombre: item.cuenta.entidadFinanciera?.nombre ?? null,
      monedaCodigo: item.cuenta.moneda.codigo,
      monedaSimbolo: item.cuenta.moneda.simbolo,
      origen: item.origen,
    }));

    return new StatusResponse(true, 200, 'Transacciones obtenidas', data);
  }

  async findOneById(
    id: number,
    usuario: Usuario,
  ): Promise<StatusResponse<any>> {
    const transaccion = await this.transaccionRepository.findOne({
      where: {
        id,
        usuario: { id: usuario.id },
        activo: true,
        eliminado: false,
      },
      relations: [
        'usuario',
        'cuenta',
        'cuenta.moneda',
        'cuenta.entidadFinanciera',
        'categoria',
        'subcategoria',
      ],
    });

    if (!transaccion) {
      throw new NotFoundException('No se encontro la transaccion');
    }

    return new StatusResponse(true, 200, 'Transaccion obtenida', {
      id: transaccion.id,
      fecha: transaccion.fecha,
      tipo: transaccion.tipo,
      monto: Number(transaccion.monto),
      concepto: transaccion.concepto,
      descripcion: transaccion.descripcion,
      nota: transaccion.nota,
      categoriaNombre: transaccion.categoria?.nombre ?? null,
      subcategoriaNombre: transaccion.subcategoria?.nombre ?? null,
      cuentaAlias: transaccion.cuenta.alias,
      entidadFinancieraNombre: transaccion.cuenta.entidadFinanciera?.nombre ?? null,
      monedaCodigo: transaccion.cuenta.moneda.codigo,
      monedaSimbolo: transaccion.cuenta.moneda.simbolo,
      origen: transaccion.origen,
      fechaRegistro: transaccion.fechaRegistro,
    });
  }

  private async createTransaction(
    dto: CrearTransaccionBaseDto,
    usuario: Usuario,
    ip: string,
    tipo: TipoTransaccionOperativa,
    origen: OrigenTransaccionOperativa,
    externalMessageId?: string,
  ): Promise<StatusResponse<any>> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await this.categoriaFinanceService.ensureCategoriasBase();

      if (externalMessageId) {
        const duplicated = await queryRunner.manager.findOne(Transaccion, {
          where: {
            usuario: { id: usuario.id },
            externalMessageId,
          },
          relations: ['usuario'],
        });

        if (duplicated) {
          await queryRunner.rollbackTransaction();
          return new StatusResponse(true, 200, 'Mensaje ya procesado', {
            idTransaccion: duplicated.id,
          });
        }
      }

      if (!dto.monto || dto.monto <= 0) {
        throw new BadRequestException('El monto debe ser mayor a 0');
      }

      const cuenta = await queryRunner.manager.findOne(Cuenta, {
        where: {
          id: dto.idCuenta,
          usuario: { id: usuario.id },
          activo: true,
          eliminado: false,
        },
        relations: ['usuario'],
      });
      if (!cuenta) {
        throw new NotFoundException('La cuenta no existe o no pertenece al usuario');
      }

      const tipoCategoria =
        tipo === TipoTransaccion.INGRESO
          ? TipoCategoriaFinance.INGRESO
          : TipoCategoriaFinance.EGRESO;

      const categoria = await queryRunner.manager.findOne(CategoriaFinance, {
        where: {
          id: dto.idCategoria,
          tipo: tipoCategoria,
          activo: true,
          eliminado: false,
        },
      });
      if (!categoria) {
        throw new BadRequestException(
          `Categoria invalida para una transaccion de tipo ${tipo}`,
        );
      }

      let subcategoria: SubcategoriaFinance | null = null;
      if (dto.idSubcategoria) {
        subcategoria = await queryRunner.manager.findOne(SubcategoriaFinance, {
          where: {
            id: dto.idSubcategoria,
            categoria: { id: categoria.id },
            activo: true,
            eliminado: false,
          },
          relations: ['categoria'],
        });
        if (!subcategoria) {
          throw new BadRequestException(
            'La subcategoria no existe o no pertenece a la categoria seleccionada',
          );
        }
      }

      const transaccion = queryRunner.manager.create(Transaccion, {
        usuario,
        cuenta,
        tipo,
        categoria,
        subcategoria,
        fecha: this.resolveTransactionDate(dto.fecha),
        concepto: dto.concepto,
        descripcion: dto.concepto,
        monto: dto.monto,
        comprobanteUrl: null,
        nota: dto.nota ?? null,
        externalMessageId: externalMessageId ?? null,
        origen,
        usuarioRegistro: usuario.login,
        ipRegistro: ip,
      });

      const saved = await queryRunner.manager.save(Transaccion, transaccion);

      const saldoActual = Number(cuenta.saldoActual);
      const nuevoSaldo =
        tipo === TipoTransaccion.EGRESO
          ? saldoActual - Number(dto.monto)
          : saldoActual + Number(dto.monto);

      cuenta.saldoActual = Number(nuevoSaldo.toFixed(2));
      cuenta.usuarioModificacion = usuario.login;
      cuenta.ipModificacion = ip;
      cuenta.fechaModificacion = new Date();
      await queryRunner.manager.save(Cuenta, cuenta);

      await queryRunner.commitTransaction();

      return new StatusResponse(true, 201, `${tipo} registrado`, {
        idTransaccion: saved.id,
        idCuenta: cuenta.id,
        tipo: saved.tipo,
        monto: Number(saved.monto),
        saldoActual: Number(cuenta.saldoActual),
        concepto: saved.concepto,
        fecha: saved.fecha,
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error(`Error al registrar ${tipo}:`, error);
      return new StatusResponse(false, 500, `Error al registrar ${tipo}`, error);
    } finally {
      await queryRunner.release();
    }
  }

  private resolveTransactionDate(fecha?: string): Date {
    if (!fecha) {
      return new Date();
    }

    const raw = String(fecha).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      try {
        return parseDateOnly(raw);
      } catch {
        throw new BadRequestException('Fecha invalida');
      }
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Fecha invalida');
    }
    return parsed;
  }
}
