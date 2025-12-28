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
        return new StatusResponse(false, 404, 'Modulo no encontrada', null);
      }
      return new StatusResponse(true, 200, 'Modulo encontrada', modulo);
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
      return new StatusResponse(true, 201, 'Modulo creada', saved);
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
      const modulo = await this.moduloRepository.findOne({ where: { id } });
      if (!modulo) {
        return new StatusResponse(false, 404, 'Modulo no encontrada', null);
      }
      // En servicio
      const moduloPlano = {
        ...dto,
        usuarioModificacion: usuario,
        ipModificacion: ip,
        fechaModificacion: new Date(),
      };

      await this.moduloRepository.update(id, moduloPlano);

      const updated = await this.moduloRepository.findOne({ where: { id } });
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
      await this.moduloRepository.remove(modulo);

      return new StatusResponse(true, 200, 'Modulo eliminada', modulo);
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

      // Luego eliminamos
      await this.moduloRepository.remove(auditadas);

      return new StatusResponse(true, 200, 'Modulos eliminados', ids);
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
