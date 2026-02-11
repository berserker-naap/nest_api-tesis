import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StatusResponse } from 'src/common/dto/response.dto';
import { Usuario } from 'src/security/entities/usuario.entity';
import { DataSource, Repository } from 'typeorm';
import { CrearIngresoDto, CrearTransaccionBaseDto } from '../dto/transaccion.dto';
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
    dto: CrearIngresoDto,
    usuario: Usuario,
    ip: string,
  ): Promise<StatusResponse<any>> {
    return this.createTransaction(dto, usuario, ip, 'EGRESO', 'MANUAL');
  }

  async createIngreso(
    dto: CrearIngresoDto,
    usuario: Usuario,
    ip: string,
  ): Promise<StatusResponse<any>> {
    return this.createTransaction(dto, usuario, ip, 'INGRESO', 'MANUAL');
  }

  async createFromWhatsapp(
    dto: CrearTransaccionBaseDto,
    usuario: Usuario,
    tipo: 'INGRESO' | 'EGRESO',
    externalMessageId: string,
    ip: string,
  ): Promise<StatusResponse<any>> {
    return this.createTransaction(
      dto,
      usuario,
      ip,
      tipo,
      'IMPORTACION',
      externalMessageId,
    );
  }

  private async createTransaction(
    dto: CrearTransaccionBaseDto,
    usuario: Usuario,
    ip: string,
    tipo: 'INGRESO' | 'EGRESO',
    origen: 'MANUAL' | 'IMPORTACION',
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

      const categoria = await queryRunner.manager.findOne(CategoriaFinance, {
        where: {
          id: dto.idCategoria,
          tipo,
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
        fecha: dto.fecha ?? new Date(),
        concepto: dto.concepto,
        descripcion: dto.concepto,
        monto: dto.monto,
        comprobanteUrl: dto.comprobanteUrl ?? null,
        nota: dto.nota ?? null,
        externalMessageId: externalMessageId ?? null,
        origen,
        usuarioRegistro: usuario.login,
        ipRegistro: ip,
      });

      const saved = await queryRunner.manager.save(Transaccion, transaccion);

      const saldoActual = Number(cuenta.saldoActual);
      const nuevoSaldo =
        tipo === 'EGRESO' ? saldoActual - Number(dto.monto) : saldoActual + Number(dto.monto);

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
        comprobanteUrl: saved.comprobanteUrl,
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
}
