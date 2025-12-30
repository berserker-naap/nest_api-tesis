import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StatusResponse } from 'src/common/dto/response.dto';
import { In, Repository } from 'typeorm';
import { Rol } from '../entities/rol.entity';
import { CreateUpdateRolDto } from '../dto/rol.dto';

@Injectable()
export class RolService {
  constructor(
    @InjectRepository(Rol)
    private readonly rolRepository: Repository<Rol>,
  ) {}

  async findAll(): Promise<StatusResponse<any>> {
    try {
      const roles = await this.rolRepository.find({
        where: { activo: true, eliminado: false },
        select: ['id', 'nombre', 'descripcion'],
      });
      return new StatusResponse(true, 200, 'Roles obtenidos', roles);
    } catch (error) {
      return new StatusResponse(false, 500, 'Error al obtener roles', error);
    }
  }

  async findOne(id: number): Promise<StatusResponse<any>> {
    try {
      const rol = await this.rolRepository.findOne({
        where: { id, activo: true, eliminado: false },
        select: ['id', 'nombre', 'descripcion'],
      });
      if (!rol) {
        return new StatusResponse(false, 404, 'Rol no encontrado', null);
      }
      return new StatusResponse(true, 200, 'Rol encontrado', rol);
    } catch (error) {
      return new StatusResponse(false, 500, 'Error al obtener rol', error);
    }
  }

  async create(
    dto: CreateUpdateRolDto,
    usuario: string,
    ip: string,
  ): Promise<StatusResponse<any>> {
    try {
      const fechaRegistro = new Date();
      const rol = this.rolRepository.create({
        ...dto,
        usuarioRegistro: usuario,
        ipRegistro: ip,
        fechaRegistro,
      });
      const saved = await this.rolRepository.save(rol);
      return new StatusResponse(true, 201, 'Rol creado', saved);
    } catch (error) {
      return new StatusResponse(false, 500, 'Error al crear rol', error);
    }
  }

  async update(
    id: number,
    dto: CreateUpdateRolDto,
    usuario: string,
    ip: string,
  ): Promise<StatusResponse<any>> {
    try {
      const rol = await this.rolRepository.findOne({
        where: { id, activo: true, eliminado: false },
      });
      if (!rol) {
        return new StatusResponse(false, 404, 'Rol no encontrado', null);
      }
      // En servicio
      const rolPlano = {
        ...dto,
        usuarioModificacion: usuario,
        ipModificacion: ip,
        fechaModificacion: new Date(),
      };

      const updated = await this.rolRepository.save(rolPlano);

      return new StatusResponse(true, 200, 'Rol actualizado', updated);
    } catch (error) {
      return new StatusResponse(false, 500, 'Error al actualizar rol', error);
    }
  }

  async delete(
    id: number,
    usuario: string,
    ip: string,
  ): Promise<StatusResponse<any>> {
    try {
      const rol = await this.rolRepository.findOne({
        where: { id, activo: true, eliminado: false },
      });
      if (!rol) {
        return new StatusResponse(false, 404, 'Rol no encontrado', null);
      }

      rol.usuarioEliminacion = usuario;
      rol.ipEliminacion = ip;
      rol.activo = false;
      rol.eliminado = true;
      rol.fechaEliminacion = new Date();

      await this.rolRepository.save(rol);

      return new StatusResponse(true, 200, 'Rol eliminado', null);
    } catch (error) {
      return new StatusResponse(false, 500, 'Error al eliminar rol', error);
    }
  }

  async deleteMany(
    ids: number[],
    usuario: string,
    ip: string,
  ): Promise<StatusResponse<any>> {
    try {
      const roles = await this.rolRepository.findBy({
        id: In(ids),
        activo: true,
        eliminado: false,
      });

      if (!roles.length) {
        return new StatusResponse(
          false,
          404,
          'No se encontraron roles para eliminar',
          null,
        );
      }

      // Actualizar campos de auditoría antes de eliminar
      const auditadas = roles.map((rol) => {
        rol.usuarioEliminacion = usuario;
        rol.ipEliminacion = ip;
        rol.activo = false;
        rol.eliminado = true;
        rol.fechaEliminacion = new Date();
        return rol;
      });

      // Primero guardamos los cambios de auditoría
      await this.rolRepository.save(auditadas);

      return new StatusResponse(true, 200, 'Roles eliminados', null);
    } catch (error) {
      return new StatusResponse(
        false,
        500,
        'Error al eliminar múltiples roles',
        error,
      );
    }
  }
}
