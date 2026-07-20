import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StatusResponse } from 'src/common/dto/response.dto';
import { parseDateOnly } from 'src/common/utils/date-only.util';
import { Usuario } from 'src/security/entities/usuario.entity';
import { DataSource, EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import {
  ActualizarTransaccionDto,
  CrearEgresoDto,
  FiltroTransaccionesDto,
  CrearIngresoDto,
  CrearPagoTarjetaDto,
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
        nota,
        externalMessageId: null,
        origen: OrigenTransaccion.TRANSFERENCIA,
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
        nota,
        externalMessageId: null,
        origen: OrigenTransaccion.TRANSFERENCIA,
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

  async createPagoTarjeta(
    dto: CrearPagoTarjetaDto,
    usuario: Usuario,
    ip: string,
  ): Promise<StatusResponse<any>> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (dto.idCuentaOrigen === dto.idTarjetaCredito) {
        throw new BadRequestException(
          'La cuenta de pago y la tarjeta deben ser diferentes',
        );
      }

      const cuentaOrigen = await queryRunner.manager.findOne(Cuenta, {
        where: {
          id: dto.idCuentaOrigen,
          usuario: { id: usuario.id },
          activo: true,
          eliminado: false,
        },
        relations: ['usuario', 'moneda', 'tipoCuenta'],
      });
      if (!cuentaOrigen) {
        throw new NotFoundException(
          'La cuenta de pago no existe o no pertenece al usuario',
        );
      }

      const tarjeta = await queryRunner.manager.findOne(Cuenta, {
        where: {
          id: dto.idTarjetaCredito,
          usuario: { id: usuario.id },
          activo: true,
          eliminado: false,
        },
        relations: ['usuario', 'moneda', 'tipoCuenta'],
      });
      if (!tarjeta) {
        throw new NotFoundException(
          'La tarjeta no existe o no pertenece al usuario',
        );
      }

      if (!this.isCreditCard(tarjeta)) {
        throw new BadRequestException('La cuenta seleccionada no es una tarjeta de credito');
      }
      if (this.isCreditCard(cuentaOrigen)) {
        throw new BadRequestException('El pago debe salir de una cuenta que no sea tarjeta de credito');
      }
      if (cuentaOrigen.moneda.codigo !== tarjeta.moneda.codigo) {
        throw new BadRequestException('La cuenta de pago y la tarjeta deben tener la misma moneda');
      }

      const monto = Number(dto.monto);
      const saldoOrigen = Number(cuentaOrigen.saldoActual);
      const lineaCredito = Number(tarjeta.lineaCredito ?? 0);
      const disponibleTarjeta = Number(tarjeta.saldoActual);
      const deudaPendiente = Number(
        Math.max(lineaCredito - disponibleTarjeta, 0).toFixed(2),
      );

      if (saldoOrigen < monto) {
        throw new BadRequestException('La cuenta seleccionada no tiene saldo suficiente');
      }
      if (deudaPendiente <= 0) {
        throw new BadRequestException('La tarjeta no tiene deuda pendiente');
      }
      if (monto > deudaPendiente) {
        throw new BadRequestException(
          `El pago no puede superar la deuda pendiente de ${tarjeta.moneda.simbolo}${deudaPendiente.toFixed(2)}`,
        );
      }

      const fechaTransaccion = this.resolveTransactionDate(dto.fecha);
      const concepto = `Pago de tarjeta ${tarjeta.alias}`;
      const nota = dto.nota?.trim() || null;

      const salida = queryRunner.manager.create(Transaccion, {
        usuario,
        cuenta: cuentaOrigen,
        tipo: TipoTransaccion.EGRESO,
        categoria: null,
        subcategoria: null,
        fecha: fechaTransaccion,
        concepto,
        descripcion: `Pago enviado a ${tarjeta.alias}`,
        monto,
        nota,
        externalMessageId: null,
        origen: OrigenTransaccion.PAGO_TARJETA,
        usuarioRegistro: usuario.login,
        ipRegistro: ip,
      });

      const entrada = queryRunner.manager.create(Transaccion, {
        usuario,
        cuenta: tarjeta,
        tipo: TipoTransaccion.INGRESO,
        categoria: null,
        subcategoria: null,
        fecha: fechaTransaccion,
        concepto,
        descripcion: `Pago recibido desde ${cuentaOrigen.alias}`,
        monto,
        nota,
        externalMessageId: null,
        origen: OrigenTransaccion.PAGO_TARJETA,
        usuarioRegistro: usuario.login,
        ipRegistro: ip,
      });

      const savedSalida = await queryRunner.manager.save(Transaccion, salida);
      const savedEntrada = await queryRunner.manager.save(Transaccion, entrada);

      cuentaOrigen.saldoActual = Number((saldoOrigen - monto).toFixed(2));
      cuentaOrigen.usuarioModificacion = usuario.login;
      cuentaOrigen.ipModificacion = ip;
      cuentaOrigen.fechaModificacion = new Date();

      tarjeta.saldoActual = Number((disponibleTarjeta + monto).toFixed(2));
      tarjeta.usuarioModificacion = usuario.login;
      tarjeta.ipModificacion = ip;
      tarjeta.fechaModificacion = new Date();

      await queryRunner.manager.save(Cuenta, cuentaOrigen);
      await queryRunner.manager.save(Cuenta, tarjeta);
      await queryRunner.commitTransaction();

      return new StatusResponse(true, 201, 'Pago de tarjeta registrado', {
        idTransaccionSalida: savedSalida.id,
        idTransaccionEntrada: savedEntrada.id,
        idCuentaOrigen: cuentaOrigen.id,
        idTarjetaCredito: tarjeta.id,
        monto,
        deudaRestante: Number((deudaPendiente - monto).toFixed(2)),
        saldoCuentaOrigen: Number(cuentaOrigen.saldoActual),
        disponibleTarjeta: Number(tarjeta.saldoActual),
        fecha: fechaTransaccion,
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Error al registrar pago de tarjeta:', error);
      const message =
        error instanceof BadRequestException || error instanceof NotFoundException
          ? String(error.getResponse() instanceof Object
              ? (error.getResponse() as { message?: string }).message ?? error.message
              : error.message)
          : 'Error al registrar pago de tarjeta';
      const statusCode =
        error instanceof BadRequestException || error instanceof NotFoundException
          ? error.getStatus()
          : 500;
      return new StatusResponse(false, statusCode, message, null);
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
    try {
      if (
        query.montoMin !== undefined &&
        query.montoMax !== undefined &&
        Number(query.montoMin) > Number(query.montoMax)
      ) {
        throw new BadRequestException('El monto mínimo no puede superar al monto máximo');
      }
      if (
        query.fechaDesde &&
        query.fechaHasta &&
        this.resolveTransactionDate(query.fechaDesde) > this.resolveTransactionDate(query.fechaHasta)
      ) {
        throw new BadRequestException('La fecha inicial no puede superar a la fecha final');
      }

      const qb = this.buildFilteredQuery(query, usuario.id);
      const totalResultados = await qb.clone().getCount();
      const rawTotals = await qb
        .clone()
        .select('moneda.codigo', 'monedaCodigo')
        .addSelect('moneda.simbolo', 'monedaSimbolo')
        .addSelect(
          `SUM(CASE WHEN transaccion.tipo = 'INGRESO' AND categoria.id IS NOT NULL THEN transaccion.monto ELSE 0 END)`,
          'ingresos',
        )
        .addSelect(
          `SUM(CASE WHEN transaccion.tipo = 'EGRESO' AND categoria.id IS NOT NULL THEN transaccion.monto ELSE 0 END)`,
          'egresos',
        )
        .addSelect('COUNT(transaccion.id)', 'cantidad')
        .groupBy('moneda.codigo')
        .addGroupBy('moneda.simbolo')
        .getRawMany<{
          monedaCodigo: string;
          monedaSimbolo: string;
          ingresos: string;
          egresos: string;
          cantidad: string;
        }>();

      const transacciones = await qb
        .orderBy('transaccion.fecha', 'DESC')
        .addOrderBy('transaccion.id', 'DESC')
        .take(query.limit ?? 120)
        .getMany();

      const items = transacciones.map((item) => this.toListItem(item));
      const totalesPorMoneda = rawTotals.map((item) => {
        const ingresos = Number(item.ingresos ?? 0);
        const egresos = Number(item.egresos ?? 0);
        return {
          monedaCodigo: item.monedaCodigo,
          monedaSimbolo: item.monedaSimbolo,
          ingresos: Number(ingresos.toFixed(2)),
          egresos: Number(egresos.toFixed(2)),
          balance: Number((ingresos - egresos).toFixed(2)),
          cantidad: Number(item.cantidad ?? 0),
        };
      });

      return new StatusResponse(true, 200, 'Transacciones obtenidas', {
        items,
        totalesPorMoneda,
        totalResultados,
      });
    } catch (error) {
      return this.failureResponse(error, 'No se pudieron obtener las transacciones');
    }
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
      idCuenta: transaccion.cuenta.id,
      fecha: transaccion.fecha,
      tipo: transaccion.tipo,
      monto: Number(transaccion.monto),
      concepto: transaccion.concepto,
      descripcion: transaccion.descripcion,
      nota: transaccion.nota,
      categoriaNombre: transaccion.categoria?.nombre ?? null,
      idCategoria: transaccion.categoria?.id ?? null,
      subcategoriaNombre: transaccion.subcategoria?.nombre ?? null,
      idSubcategoria: transaccion.subcategoria?.id ?? null,
      cuentaAlias: transaccion.cuenta.alias,
      entidadFinancieraNombre: transaccion.cuenta.entidadFinanciera?.nombre ?? null,
      monedaCodigo: transaccion.cuenta.moneda.codigo,
      monedaSimbolo: transaccion.cuenta.moneda.simbolo,
      origen: transaccion.origen,
      fechaRegistro: transaccion.fechaRegistro,
      editable: this.canModifyTransaction(transaccion),
    });
  }

  async update(
    id: number,
    dto: ActualizarTransaccionDto,
    usuario: Usuario,
    ip: string,
  ): Promise<StatusResponse<any>> {
    await this.categoriaFinanceService.ensureCategoriasBase();
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const transaccion = await queryRunner.manager.findOne(Transaccion, {
        where: { id, usuario: { id: usuario.id }, activo: true, eliminado: false },
        relations: [
          'usuario',
          'cuenta',
          'cuenta.tipoCuenta',
          'cuenta.moneda',
          'categoria',
          'subcategoria',
        ],
      });
      if (!transaccion) throw new NotFoundException('No se encontró la transacción');
      if (!this.canModifyTransaction(transaccion)) {
        throw new BadRequestException('Esta operación no puede editarse de forma individual');
      }

      const nuevaCuenta = await queryRunner.manager.findOne(Cuenta, {
        where: { id: dto.idCuenta, usuario: { id: usuario.id }, activo: true, eliminado: false },
        relations: ['usuario', 'tipoCuenta', 'moneda'],
      });
      if (!nuevaCuenta) throw new NotFoundException('La cuenta seleccionada no existe');
      if (nuevaCuenta.moneda.codigo !== transaccion.cuenta.moneda.codigo) {
        throw new BadRequestException('No se puede cambiar la moneda de una transacción existente');
      }

      const { categoria, subcategoria } = await this.resolveCategorySelection(
        queryRunner.manager,
        dto.idCategoria,
        dto.idSubcategoria,
        transaccion.tipo as TipoTransaccionOperativa,
      );

      const accounts = new Map<number, { account: Cuenta; balance: number }>();
      accounts.set(transaccion.cuenta.id, {
        account: transaccion.cuenta,
        balance: Number(transaccion.cuenta.saldoActual),
      });
      if (!accounts.has(nuevaCuenta.id)) {
        accounts.set(nuevaCuenta.id, { account: nuevaCuenta, balance: Number(nuevaCuenta.saldoActual) });
      }

      const oldState = accounts.get(transaccion.cuenta.id)!;
      oldState.balance += transaccion.tipo === TipoTransaccion.EGRESO
        ? Number(transaccion.monto)
        : -Number(transaccion.monto);
      const newState = accounts.get(nuevaCuenta.id)!;
      newState.balance += transaccion.tipo === TipoTransaccion.EGRESO
        ? -Number(dto.monto)
        : Number(dto.monto);

      for (const state of accounts.values()) {
        this.assertBalanceAllowed(state.account, state.balance);
        state.account.saldoActual = Number(state.balance.toFixed(2));
        state.account.usuarioModificacion = usuario.login;
        state.account.ipModificacion = ip;
        state.account.fechaModificacion = new Date();
        await queryRunner.manager.save(Cuenta, state.account);
      }

      transaccion.cuenta = nuevaCuenta;
      transaccion.categoria = categoria;
      transaccion.subcategoria = subcategoria;
      transaccion.fecha = this.resolveTransactionDate(dto.fecha);
      transaccion.monto = Number(dto.monto);
      transaccion.concepto = dto.concepto.trim();
      transaccion.descripcion = dto.concepto.trim();
      transaccion.nota = dto.nota?.trim() || null;
      transaccion.usuarioModificacion = usuario.login;
      transaccion.ipModificacion = ip;
      transaccion.fechaModificacion = new Date();
      await queryRunner.manager.save(Transaccion, transaccion);
      await queryRunner.commitTransaction();

      return new StatusResponse(true, 200, 'Transacción actualizada', { id: transaccion.id });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      return this.failureResponse(error, 'No se pudo actualizar la transacción');
    } finally {
      await queryRunner.release();
    }
  }

  async remove(
    id: number,
    usuario: Usuario,
    ip: string,
  ): Promise<StatusResponse<any>> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const transaccion = await queryRunner.manager.findOne(Transaccion, {
        where: { id, usuario: { id: usuario.id }, activo: true, eliminado: false },
        relations: ['usuario', 'cuenta', 'cuenta.tipoCuenta', 'categoria'],
      });
      if (!transaccion) throw new NotFoundException('No se encontró la transacción');
      if (!this.canModifyTransaction(transaccion)) {
        throw new BadRequestException('Esta operación no puede eliminarse de forma individual');
      }

      const balance = Number(transaccion.cuenta.saldoActual) + (
        transaccion.tipo === TipoTransaccion.EGRESO
          ? Number(transaccion.monto)
          : -Number(transaccion.monto)
      );
      this.assertBalanceAllowed(transaccion.cuenta, balance);
      transaccion.cuenta.saldoActual = Number(balance.toFixed(2));
      transaccion.cuenta.usuarioModificacion = usuario.login;
      transaccion.cuenta.ipModificacion = ip;
      transaccion.cuenta.fechaModificacion = new Date();
      await queryRunner.manager.save(Cuenta, transaccion.cuenta);

      transaccion.activo = false;
      transaccion.eliminado = true;
      transaccion.usuarioModificacion = usuario.login;
      transaccion.ipModificacion = ip;
      transaccion.fechaModificacion = new Date();
      await queryRunner.manager.save(Transaccion, transaccion);
      await queryRunner.commitTransaction();
      return new StatusResponse(true, 200, 'Transacción eliminada', { id });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      return this.failureResponse(error, 'No se pudo eliminar la transacción');
    } finally {
      await queryRunner.release();
    }
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

  private buildFilteredQuery(
    query: FiltroTransaccionesDto,
    idUsuario: number,
  ): SelectQueryBuilder<Transaccion> {
    const qb = this.transaccionRepository
      .createQueryBuilder('transaccion')
      .innerJoinAndSelect('transaccion.usuario', 'usuario')
      .innerJoinAndSelect('transaccion.cuenta', 'cuenta')
      .innerJoinAndSelect('cuenta.moneda', 'moneda')
      .leftJoinAndSelect('cuenta.entidadFinanciera', 'entidadFinanciera')
      .leftJoinAndSelect('transaccion.categoria', 'categoria')
      .leftJoinAndSelect('transaccion.subcategoria', 'subcategoria')
      .where('usuario.id = :idUsuario', { idUsuario })
      .andWhere('transaccion.eliminado = :eliminado', { eliminado: false })
      .andWhere('transaccion.activo = :activo', { activo: true });

    if (query.tipo) qb.andWhere('transaccion.tipo = :tipo', { tipo: query.tipo });
    if (query.idCuenta) qb.andWhere('cuenta.id = :idCuenta', { idCuenta: query.idCuenta });
    if (query.idCategoria) {
      qb.andWhere('categoria.id = :idCategoria', { idCategoria: query.idCategoria });
    }
    if (query.monedaCodigo?.trim()) {
      qb.andWhere('UPPER(moneda.codigo) = :monedaCodigo', {
        monedaCodigo: query.monedaCodigo.trim().toUpperCase(),
      });
    }
    if (query.fechaDesde) {
      qb.andWhere('transaccion.fecha >= :fechaDesde', {
        fechaDesde: this.resolveTransactionDate(query.fechaDesde),
      });
    }
    if (query.fechaHasta) {
      const fechaHastaExclusive = this.resolveTransactionDate(query.fechaHasta);
      fechaHastaExclusive.setDate(fechaHastaExclusive.getDate() + 1);
      qb.andWhere('transaccion.fecha < :fechaHastaExclusive', { fechaHastaExclusive });
    }
    if (query.montoMin !== undefined) {
      qb.andWhere('transaccion.monto >= :montoMin', { montoMin: Number(query.montoMin) });
    }
    if (query.montoMax !== undefined) {
      qb.andWhere('transaccion.monto <= :montoMax', { montoMax: Number(query.montoMax) });
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
    return qb;
  }

  private toListItem(item: Transaccion): Record<string, unknown> {
    return {
      id: item.id,
      idCuenta: item.cuenta.id,
      fecha: item.fecha,
      tipo: item.tipo,
      monto: Number(item.monto),
      concepto: item.concepto,
      nota: item.nota,
      idCategoria: item.categoria?.id ?? null,
      categoriaNombre: item.categoria?.nombre ?? null,
      idSubcategoria: item.subcategoria?.id ?? null,
      subcategoriaNombre: item.subcategoria?.nombre ?? null,
      cuentaAlias: item.cuenta.alias,
      entidadFinancieraNombre: item.cuenta.entidadFinanciera?.nombre ?? null,
      monedaCodigo: item.cuenta.moneda.codigo,
      monedaSimbolo: item.cuenta.moneda.simbolo,
      origen: item.origen,
      editable: this.canModifyTransaction(item),
    };
  }

  private async resolveCategorySelection(
    manager: EntityManager,
    idCategoria: number,
    idSubcategoria: number | null | undefined,
    tipo: TipoTransaccionOperativa,
  ): Promise<{ categoria: CategoriaFinance; subcategoria: SubcategoriaFinance | null }> {
    const categoria = await manager.findOne(CategoriaFinance, {
      where: {
        id: idCategoria,
        tipo: tipo === TipoTransaccion.INGRESO
          ? TipoCategoriaFinance.INGRESO
          : TipoCategoriaFinance.EGRESO,
        activo: true,
        eliminado: false,
      },
    });
    if (!categoria) throw new BadRequestException('La categoría no corresponde al tipo de movimiento');

    let subcategoria: SubcategoriaFinance | null = null;
    if (idSubcategoria) {
      subcategoria = await manager.findOne(SubcategoriaFinance, {
        where: {
          id: idSubcategoria,
          categoria: { id: categoria.id },
          activo: true,
          eliminado: false,
        },
        relations: ['categoria'],
      });
      if (!subcategoria) throw new BadRequestException('La subcategoría no pertenece a la categoría');
    }
    return { categoria, subcategoria };
  }

  private canModifyTransaction(item: Transaccion): boolean {
    return item.origen === OrigenTransaccion.MANUAL
      && item.categoria !== null
      && (item.tipo === TipoTransaccion.INGRESO || item.tipo === TipoTransaccion.EGRESO);
  }

  private assertBalanceAllowed(account: Cuenta, balance: number): void {
    if (!this.isCreditCard(account)) return;
    const line = Number(account.lineaCredito ?? 0);
    if (balance < 0 || balance > line) {
      throw new BadRequestException(
        'No se puede modificar este movimiento porque dejaría la tarjeta fuera de su línea de crédito',
      );
    }
  }

  private failureResponse(error: unknown, fallback: string): StatusResponse<any> {
    if (error instanceof BadRequestException || error instanceof NotFoundException) {
      return new StatusResponse(false, error.getStatus(), error.message, null);
    }
    console.error(fallback, error);
    return new StatusResponse(false, 500, fallback, null);
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

  private isCreditCard(cuenta: Cuenta): boolean {
    const normalized = (cuenta.tipoCuenta?.nombre ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .trim();
    return normalized.includes('TARJETA') && normalized.includes('CREDITO');
  }
}
