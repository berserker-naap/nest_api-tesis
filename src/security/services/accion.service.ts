import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StatusResponse } from 'src/common/dto/response.dto';
import { In, Repository } from 'typeorm';
import { Accion } from '../entities/accion.entity';
import { CreateUpdateAccionDto } from '../dto/accion.dto';

@Injectable()
export class AccionService {
  constructor(
    @InjectRepository(Accion)
    private readonly accionRepository: Repository<Accion>,
  ) { }

  async findAll(): Promise<StatusResponse<any>> {
    try {
      const acciones = await this.accionRepository.find({
        where: {
          activo: true,
          eliminado: false,
        },
      });
      return new StatusResponse(true, 200, 'Acciones obtenidas', acciones);
    } catch (error) {
      return new StatusResponse(false, 500, 'Error al obtener acciones', error);
    }
  }

  async findOne(id: number): Promise<StatusResponse<any>> {
    try {
      const accion = await this.accionRepository.findOne({ where: { id, activo: true, eliminado: false } });
      if (!accion) {
        return new StatusResponse(false, 404, 'Accion no encontrada', null);
      }
      return new StatusResponse(true, 200, 'Accion encontrada', accion);
    } catch (error) {
      return new StatusResponse(false, 500, 'Error al obtener accion', error);
    }
  }

  async create(
    dto: CreateUpdateAccionDto,
    usuario: string,
    ip: string,
  ): Promise<StatusResponse<any>> {
    try {
      const fechaRegistro = new Date();
      const accion = this.accionRepository.create({
        ...dto,
        usuarioRegistro: usuario,
        fechaRegistro,
        ipRegistro: ip,
      });
      const saved = await this.accionRepository.save(accion);
      return new StatusResponse(true, 201, 'Acción creada', saved);
    } catch (error) {
      return new StatusResponse(false, 500, 'Error al crear acción', error);
    }
  }

  async update(
    id: number,
    dto: CreateUpdateAccionDto,
    usuario: string,
    ip: string,
  ): Promise<StatusResponse<any>> {
    try {
     const fechaModificacion = new Date(); 

      const accion = await this.accionRepository.findOne({ where: { id, activo: true, eliminado: false } });
      if (!accion) {
        return new StatusResponse(false, 404, 'Acción no encontrada', null);
      }
      accion.nombre = dto.nombre;
      accion.usuarioModificacion = usuario;
      accion.ipModificacion = ip;
      accion.fechaModificacion = fechaModificacion;

      const updated = await this.accionRepository.save(accion);
      return new StatusResponse(true, 200, 'Acción actualizada', updated);
    } catch (error) {
      return new StatusResponse(
        false,
        500,
        'Error al actualizar acción',
        error,
      );
    }
  }

  async delete(
    id: number,
    usuario: string,
    ip: string,
  ): Promise<StatusResponse<any>> {
    try {
      const fechaEliminacion = new Date();

      const accion = await this.accionRepository.findOne({ where: { id, activo: true, eliminado: false } });
      if (!accion) {
        return new StatusResponse(false, 404, 'Acción no encontrada', null);
      }

      accion.usuarioEliminacion = usuario;
      accion.ipEliminacion = ip;
      accion.activo = false;
      accion.eliminado = true;
      accion.fechaEliminacion = fechaEliminacion;

      await this.accionRepository.save(accion);

      return new StatusResponse(true, 200, 'Acción eliminada', null);
    } catch (error) {
      return new StatusResponse(false, 500, 'Error al eliminar acción', error);
    }
  }

  async deleteMany(
    ids: number[],
    usuario: string,
    ip: string,
  ): Promise<StatusResponse<any>> {
    try {
      const fechaEliminacion = new Date();

      const acciones = await this.accionRepository.findBy({ id: In(ids), activo: true, eliminado: false });

      if (!acciones.length) {
        return new StatusResponse(
          false,
          404,
          'No se encontraron acciones para eliminar',
          null,
        );
      }

      // Actualizar campos de auditoría antes de eliminar
      const auditadas = acciones.map((accion) => {
        accion.usuarioEliminacion = usuario;
        accion.ipEliminacion = ip;
        accion.activo = false;
        accion.eliminado = true;
        accion.fechaEliminacion = fechaEliminacion;
        return accion;
      });

      // Primero guardamos los cambios de auditoría
      await this.accionRepository.save(auditadas);

      return new StatusResponse(true, 200, 'Acciones eliminadas', null);
    } catch (error) {
      return new StatusResponse(
        false,
        500,
        'Error al eliminar múltiples acciones',
        error,
      );
    }
  }
}
