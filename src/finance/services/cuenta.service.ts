import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StatusResponse } from 'src/common/dto/response.dto';
import { Usuario } from 'src/security/entities/usuario.entity';
import { DataSource, Repository } from 'typeorm';
import { CrearCuentaDto, CuentaResponseDto } from '../dto/cuenta.dto';
import { OrigenTransaccion, TipoTransaccion } from '../enum/transaccion.enum';
import { Cuenta } from '../entities/cuenta.entity';
import { EntidadFinanciera } from '../entities/entidad-financiera.entity';
import { Moneda } from '../entities/moneda.entity';
import { TipoCuenta } from '../entities/tipo-cuenta.entity';
import { Transaccion } from '../entities/transaccion.entity';

@Injectable()
export class CuentaService {
  constructor(
    @InjectRepository(Cuenta)
    private readonly cuentaRepository: Repository<Cuenta>,
    @InjectRepository(Moneda)
    private readonly monedaRepository: Repository<Moneda>,
    @InjectRepository(TipoCuenta)
    private readonly tipoCuentaRepository: Repository<TipoCuenta>,
    @InjectRepository(EntidadFinanciera)
    private readonly entidadFinancieraRepository: Repository<EntidadFinanciera>,
    @InjectRepository(Transaccion)
    private readonly transaccionRepository: Repository<Transaccion>,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    private readonly dataSource: DataSource,
  ) {}

  private isTipoCuentaTarjetaCredito(nombreTipoCuenta: string): boolean {
    const normalized = (nombreTipoCuenta ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .trim();
    return normalized.includes('TARJETA') && normalized.includes('CREDITO');
  }

  private toResponseDto(cuenta: Cuenta): CuentaResponseDto {
    const esTarjetaCredito = this.isTipoCuentaTarjetaCredito(
      cuenta.tipoCuenta.nombre,
    );
    return {
      id: cuenta.id,
      alias: cuenta.alias,
      saldoActual: Number(cuenta.saldoActual),
      lineaCredito:
        cuenta.lineaCredito !== null && cuenta.lineaCredito !== undefined
          ? Number(cuenta.lineaCredito)
          : null,
      esTarjetaCredito,
      moneda: {
        id: cuenta.moneda.id,
        codigo: cuenta.moneda.codigo,
        nombre: cuenta.moneda.nombre,
        simbolo: cuenta.moneda.simbolo,
      },
      tipoCuenta: {
        id: cuenta.tipoCuenta.id,
        nombre: cuenta.tipoCuenta.nombre,
        naturaleza: cuenta.tipoCuenta.naturaleza,
      },
      entidadFinanciera: cuenta.entidadFinanciera
        ? {
            id: cuenta.entidadFinanciera.id,
            nombre: cuenta.entidadFinanciera.nombre,
            tipo: cuenta.entidadFinanciera.tipo,
            iconoUrl: cuenta.entidadFinanciera.iconoUrl,
          }
        : null,
    };
  }

  async findAll(idUsuario: number): Promise<StatusResponse<CuentaResponseDto[] | any>> {
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

      return new StatusResponse(
        true,
        200,
        'Cuentas obtenidas',
        cuentas.map((cuenta) => this.toResponseDto(cuenta)),
      );
    } catch (error) {
      console.error('Error al obtener cuentas:', error);
      return new StatusResponse(false, 500, 'Error al obtener cuentas', error);
    }
  }

  async create(
    dto: CrearCuentaDto,
    idUsuario: number,
    usuarioRegistro: string,
    ip: string,
  ): Promise<StatusResponse<CuentaResponseDto | any>> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const usuario = await queryRunner.manager.findOne(Usuario, {
        where: { id: idUsuario, activo: true, eliminado: false },
      });
      if (!usuario) throw new NotFoundException('Usuario no encontrado');

      const aliasExistente = await queryRunner.manager.findOne(Cuenta, {
        where: {
          usuario: { id: idUsuario },
          alias: dto.alias,
          activo: true,
          eliminado: false,
        },
        relations: ['usuario'],
      });

      if (aliasExistente) {
        throw new BadRequestException('Ya existe una cuenta con ese alias');
      }

      const moneda = await queryRunner.manager.findOne(Moneda, {
        where: { id: dto.idMoneda, activo: true, eliminado: false },
      });
      if (!moneda) throw new NotFoundException('Moneda no encontrada');

      const tipoCuenta = await queryRunner.manager.findOne(TipoCuenta, {
        where: { id: dto.idTipoCuenta, activo: true, eliminado: false },
      });
      if (!tipoCuenta) throw new NotFoundException('Tipo de cuenta no encontrado');
      const esTarjetaCredito = this.isTipoCuentaTarjetaCredito(tipoCuenta.nombre);
      const montoInicial = Number(dto.saldoInicial ?? 0);

      let lineaCreditoCuenta: number | null = null;
      let saldoInicialCuenta = montoInicial;
      if (esTarjetaCredito) {
        if (dto.lineaCredito === null || dto.lineaCredito === undefined) {
          throw new BadRequestException(
            'La linea de credito es requerida para tarjeta de credito',
          );
        }
        const lineaCredito = Number(dto.lineaCredito);
        if (lineaCredito <= 0) {
          throw new BadRequestException('La linea de credito debe ser mayor a 0');
        }
        if (montoInicial > lineaCredito) {
          throw new BadRequestException(
            'El monto inicial no puede ser mayor a la linea de credito',
          );
        }
        lineaCreditoCuenta = Number(lineaCredito.toFixed(2));
        // Para tarjetas de credito, saldoActual representa disponible.
        saldoInicialCuenta = Number((lineaCredito - montoInicial).toFixed(2));
      }

      let entidadFinanciera: EntidadFinanciera | null = null;
      if (dto.idEntidadFinanciera) {
        entidadFinanciera = await queryRunner.manager.findOne(EntidadFinanciera, {
          where: {
            id: dto.idEntidadFinanciera,
            activo: true,
            eliminado: false,
          },
        });

        if (!entidadFinanciera) {
          throw new NotFoundException('Entidad financiera no encontrada');
        }
      }

      const cuenta = queryRunner.manager.create(Cuenta, {
        usuario,
        moneda,
        tipoCuenta,
        entidadFinanciera,
        alias: dto.alias,
        saldoActual: saldoInicialCuenta,
        lineaCredito: lineaCreditoCuenta,
        usuarioRegistro,
        ipRegistro: ip,
      });

      const savedCuenta = await queryRunner.manager.save(Cuenta, cuenta);

      const transaccionApertura = queryRunner.manager.create(Transaccion, {
        usuario,
        cuenta: savedCuenta,
        tipo: TipoTransaccion.AJUSTE,
        categoria: null,
        subcategoria: null,
        monto: montoInicial,
        fecha: new Date(),
        concepto: 'Apertura de cuenta',
        descripcion:
          dto.descripcionApertura ??
          'Registro de apertura de cuenta con saldo inicial',
        comprobanteUrl: null,
        nota: null,
        externalMessageId: null,
        origen: OrigenTransaccion.APERTURA,
        usuarioRegistro,
        ipRegistro: ip,
      });

      await queryRunner.manager.save(Transaccion, transaccionApertura);

      const cuentaCreada = await queryRunner.manager.findOne(Cuenta, {
        where: { id: savedCuenta.id },
        relations: ['moneda', 'tipoCuenta', 'entidadFinanciera'],
      });

      await queryRunner.commitTransaction();

      if (!cuentaCreada) {
        throw new NotFoundException('No se pudo cargar la cuenta creada');
      }

      return new StatusResponse(
        true,
        201,
        'Cuenta creada correctamente',
        this.toResponseDto(cuentaCreada),
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Error al crear cuenta:', error);
      return new StatusResponse(false, 500, 'Error al crear cuenta', error);
    } finally {
      await queryRunner.release();
    }
  }
}

