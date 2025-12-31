import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StatusResponse } from 'src/common/dto/response.dto';
import { In, Repository } from 'typeorm';
import { Modulo } from '../entities/modulo.entity';
import { CreateUpdateModuloDto } from '../dto/modulo.dto';

@Injectable()
export class ModuloService {
  constructor(
    @InjectRepository(Modulo)
    private readonly moduloRepository: Repository<Modulo>,
  ) { }

  async findAll(): Promise<StatusResponse<any>> {
    try {
      const modulos = await this.moduloRepository.find({
        where: {
          activo: true,
          eliminado: false,
        },
      });
      return new StatusResponse(true, 200, 'Modulos obtenidos', modulos);
    } catch (error) {
      return new StatusResponse(false, 500, 'Error al obtener modulos', error);
    }
  }

  async findOne(id: number): Promise<StatusResponse<any>> {
    try {
      const modulo = await this.moduloRepository.findOne({ where: { id, activo: true, eliminado: false } });
      if (!modulo) {
        return new StatusResponse(false, 404, 'Modulo no encontrado', null);
      }
      return new StatusResponse(true, 200, 'Modulo encontrado', modulo);
    } catch (error) {
      return new StatusResponse(false, 500, 'Error al obtener modulo', error);
    }
  }

  async create(
    dto: CreateUpdateModuloDto,
    usuario: string,
    ip: string,
  ): Promise<StatusResponse<any>> {
    try {
      const modulo = this.moduloRepository.create({
        ...dto,
        usuarioRegistro: usuario,
        ipRegistro: ip,
      });
      const saved = await this.moduloRepository.save(modulo);
      return new StatusResponse(true, 201, 'Modulo creado', saved);
    } catch (error) {
      return new StatusResponse(false, 500, 'Error al crear modulo', error);
    }
  }

  async update(
    id: number,
    dto: CreateUpdateModuloDto,
    usuario: string,
    ip: string,
  ): Promise<StatusResponse<any>> {
    try {
      const modulo = await this.moduloRepository.findOne({ where: { id, activo: true, eliminado: false } });
      if (!modulo) {
        return new StatusResponse(false, 404, 'Modulo no encontrado', null);
      }
      modulo.nombre = dto.nombre;
      modulo.icono = dto.icono;
      modulo.usuarioModificacion = usuario;
      modulo.ipModificacion = ip;
      modulo.fechaModificacion = new Date();

      const updated = await this.moduloRepository.save(modulo);
      return new StatusResponse(true, 200, 'Modulo actualizado', updated);
    } catch (error) {
      return new StatusResponse(
        false,
        500,
        'Error al actualizar modulo',
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
      const modulo = await this.moduloRepository.findOne({ where: { id } });
      if (!modulo) {
        return new StatusResponse(false, 404, 'Modulo no encontrada', null);
      }

      modulo.usuarioEliminacion = usuario;
      modulo.ipEliminacion = ip;
      modulo.fechaEliminacion = new Date();

      await this.moduloRepository.save(modulo);

      return new StatusResponse(true, 200, 'Modulo eliminado', null);
    } catch (error) {
      return new StatusResponse(false, 500, 'Error al eliminar modulo', error);
    }
  }

  async deleteMany(
    ids: number[],
    usuario: string,
    ip: string,
  ): Promise<StatusResponse<any>> {
    try {
      const modulos = await this.moduloRepository.findBy({ id: In(ids) });

      if (!modulos.length) {
        return new StatusResponse(
          false,
          404,
          'No se encontraron modulos para eliminar',
          null,
        );
      }

      // Actualizar campos de auditoría antes de eliminar
      const auditadas = modulos.map((modulo) => {
        modulo.usuarioEliminacion = usuario;
        modulo.ipEliminacion = ip;
        modulo.fechaEliminacion = new Date();
        return modulo;
      });

      // Primero guardamos los cambios de auditoría
      await this.moduloRepository.save(auditadas);

      return new StatusResponse(true, 200, 'Modulos eliminados', null);
    } catch (error) {
      return new StatusResponse(
        false,
        500,
        'Error al eliminar múltiples modulos',
        error,
      );
    }
  }
}
