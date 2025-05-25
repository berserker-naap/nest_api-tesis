import { Injectable } from '@nestjs/common';
import { Permiso } from '../entities/permiso.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StatusResponseDto } from 'src/common/dto/response.dto';
import { CreateUpdatePermisoDto } from '../dto/permiso.dto';

@Injectable()
export class PermisoService {
  constructor(
    @InjectRepository(Permiso)
    private readonly permisoRepository: Repository<Permiso>,
  ) {}

  async create(
    createPermisoDto: CreateUpdatePermisoDto,
  ): Promise<StatusResponseDto<any>> {
    try {
      const permiso = this.permisoRepository.create({
        ...createPermisoDto,
      });

      await this.permisoRepository.save(permiso);
      return new StatusResponseDto(true, 200, 'Permiso creado', permiso);
    } catch (error) {
      return new StatusResponseDto(false, 500, 'Error al crear permiso', error);
    }
  }

  // Obtener todos los permisos
  async findAll(): Promise<StatusResponseDto<any>> {
    try {
      const permisos = await this.permisoRepository.find();
      return new StatusResponseDto(true, 200, 'Permisos obtenidos', permisos);
    } catch (error) {
      return new StatusResponseDto(
        false,
        500,
        'Error al obtener permisos',
        error,
      );
    }
  }

  // Obtener un permiso por ID
  async findOne(id: number): Promise<StatusResponseDto<any>> {
    try {
      const permiso = await this.permisoRepository.findOne({ where: { id } });
      if (!permiso) {
        return new StatusResponseDto(false, 404, 'Permiso no encontrado', null);
      }
      return new StatusResponseDto(true, 200, 'Permiso encontrado', permiso);
    } catch (error) {
      return new StatusResponseDto(
        false,
        500,
        'Error al obtener permiso',
        error,
      );
    }
  }

  // Actualizar un Permiso
  async update(
    id: number,
    updatePermisoDto: CreateUpdatePermisoDto,
  ): Promise<StatusResponseDto<any>> {
    try {
        const permiso = await this.permisoRepository.findOne({ where: { id } });
      if (!permiso) {
        return new StatusResponseDto(false, 404, 'Permiso no encontrado', null);
      }

      // Actualizamos el permiso
      await this.permisoRepository.update(id, updatePermisoDto);
      const updatedPermiso = await this.permisoRepository.findOne({ where: { id } });

      return new StatusResponseDto(
        true,
        200,
        'Permiso actualizado',
        updatedPermiso,
      );
    } catch (error) {
      return new StatusResponseDto(
        false,
        500,
        'Error al actualizar permiso',
        error,
      );
    }
  }

  // Eliminar un Permiso (solo actualizando la propiedad `eliminado`)
  async delete(id: number): Promise<StatusResponseDto<any>> {
    try {
      const permiso = await this.permisoRepository.findOne({ where: { id } });
      if (!permiso) {
        return new StatusResponseDto(false, 404, 'Permiso no encontrado', null);
      }

      // Actualizamos la propiedad `eliminado` a true
      permiso.eliminado = true;
      await this.permisoRepository.save(permiso);

      return new StatusResponseDto(true, 200, 'Permiso eliminado', permiso);
    } catch (error) {
      return new StatusResponseDto(
        false,
        500,
        'Error al eliminar permiso',
        error,
      );
    }
  }

  // Activar o Desactivar un Permiso (actualizando la propiedad `activo`)
  async activate(id: number, activo: boolean): Promise<StatusResponseDto<any>> {
    try {
      const permiso = await this.permisoRepository.findOne({ where: { id } });
      if (!permiso) {
        return new StatusResponseDto(false, 404, 'Permiso no encontrado', null);
      }

      // Actualizamos la propiedad `activo`
      permiso.activo = activo;
      await this.permisoRepository.save(permiso);

      return new StatusResponseDto(
        true,
        200,
        `Permiso ${activo ? 'activado' : 'desactivado'}`,
        permiso,
      );
    } catch (error) {
      return new StatusResponseDto(
        false,
        500,
        'Error al actualizar el estado del permiso',
        error,
      );
    }
  }
}
