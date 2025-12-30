import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StatusResponse } from 'src/common/dto/response.dto';
import { In, Repository } from 'typeorm';
import { Opcion } from '../entities/opcion.entity';
import { CreateUpdateOpcionDto } from '../dto/opcion.dto';
import { Modulo } from '../entities/modulo.entity';

@Injectable()
export class OpcionService {
  constructor(
    @InjectRepository(Modulo)
    private readonly moduloRepository: Repository<Modulo>,
    @InjectRepository(Opcion)
    private readonly opcionRepository: Repository<Opcion>,
  ) { }

  async findAll(): Promise<StatusResponse<any>> {
    try {
      const opciones = await this.opcionRepository.find({
        relations: ['modulo'],
        where: { activo: true, eliminado: false },
      });
      return new StatusResponse(true, 200, 'Opciones obtenidas', opciones);
    } catch (error) {
      return new StatusResponse(
        false,
        500,
        'Error al obtener opciones',
        error,
      );
    }
  }

  async findOne(id: number): Promise<StatusResponse<any>> {
    try {
      const opcion = await this.opcionRepository.findOne({
        where: { id, activo: true, eliminado: false },
        relations: ['modulo'],
      });
      if (!opcion) {
        return new StatusResponse(false, 404, 'Opción no encontrada', null);
      }
      return new StatusResponse(true, 200, 'Opción encontrada', opcion);
    } catch (error) {
      return new StatusResponse(
        false,
        500,
        'Error al obtener opción',
        error,
      );
    }
  }
  async create(
    dto: CreateUpdateOpcionDto,
    usuario: string,
    ip: string
  ): Promise<StatusResponse<any>> {
    try {
      const modulo = await this.moduloRepository.findOne({ where: { id: dto.idModulo, activo: true, eliminado: false } });

      if (!modulo) {
        return new StatusResponse(false, 404, 'Módulo no encontrado', null);
      }

      const opcion = this.opcionRepository.create({
        ...dto,
        modulo,
        usuarioRegistro: usuario,
        ipRegistro: ip,
      });

      const saved = await this.opcionRepository.save(opcion);

      return new StatusResponse(true, 201, 'Opción creada', saved);
    } catch (error) {
      return new StatusResponse(false, 500, 'Error al crear opción', error);
    }
  }

  async update(
    id: number,
    dto: CreateUpdateOpcionDto,
    usuario: string,
    ip: string,
  ): Promise<StatusResponse<any>> {
    try {
      const opcion = await this.opcionRepository.findOne({
        where: { id, activo: true, eliminado: false },
        relations: ['modulo'],
      });

      if (!opcion) {
        return new StatusResponse(false, 404, 'Opción no encontrada', null);
      }

      const modulo = await this.moduloRepository.findOne({ where: { id: dto.idModulo, activo: true, eliminado: false } });

      if (!modulo) {
        return new StatusResponse(false, 404, 'Módulo no encontrado', null);
      }

      const actualizado = this.opcionRepository.create({
        ...opcion,
        ...dto,
        modulo,
        usuarioModificacion: usuario,
        ipModificacion: ip,
        fechaModificacion: new Date(),
      });

      const saved = await this.opcionRepository.save(actualizado);

      return new StatusResponse(true, 200, 'Opción actualizada', saved);
    } catch (error) {
      return new StatusResponse(false, 500, 'Error al actualizar opción', error);
    }
  }
  async delete(
    id: number,
    usuario: string,
    ip: string,
  ): Promise<StatusResponse<any>> {
    try {
      const opcion = await this.opcionRepository.findOne({
        where: { id, activo: true, eliminado: false },
        relations: ['modulo'],
      });
      if (!opcion) {
        return new StatusResponse(false, 404, 'Opción no encontrada', null);
      }

      opcion.usuarioEliminacion = usuario;
      opcion.ipEliminacion = ip;
      opcion.activo = false;
      opcion.eliminado = true;
      opcion.fechaEliminacion = new Date();

      await this.opcionRepository.save(opcion);

      return new StatusResponse(true, 200, 'Opción eliminada', null);
    } catch (error) {
      return new StatusResponse(
        false,
        500,
        'Error al eliminar opción',
        error,
      );
    }
  }

  async deleteMany(
    ids: number[],
    usuario: string,
    ip: string,
  ): Promise<StatusResponse<any>> {
    try {
      const opciones = await this.opcionRepository.findBy({ id: In(ids), activo: true, eliminado: false });

      if (!opciones.length) {
        return new StatusResponse(
          false,
          404,
          'No se encontraron opciones para eliminar',
          null,
        );
      }

      const auditadas = opciones.map((opcion) => {
        opcion.usuarioEliminacion = usuario;
        opcion.ipEliminacion = ip;
        opcion.activo = false;
        opcion.eliminado = true;
        opcion.fechaEliminacion = new Date();
        return opcion;
      });

      await this.opcionRepository.save(auditadas);

      return new StatusResponse(true, 200, 'Opciones eliminadas', null);
    } catch (error) {
      return new StatusResponse(
        false,
        500,
        'Error al eliminar múltiples opciones',
        error,
      );
    }
  }
}
