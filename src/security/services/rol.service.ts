import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { StatusResponse } from "src/common/dto/response.dto";
import { In, Repository } from "typeorm";
import { Rol } from "../entities/rol.entity";
import { CreateUpdateRolDto } from "../dto/rol.dto";

@Injectable()
export class RolService {
  constructor(
    @InjectRepository(Rol)
    private readonly rolRepository: Repository<Rol>
  ) { }

  async findAll(): Promise<StatusResponse<any>> {
    try {
      const roles = await this.rolRepository.find();
      return new StatusResponse(true, 200, 'Roles obtenidas', roles);
    } catch (error) {
      return new StatusResponse(false, 500, 'Error al obtener roles', error);
    }
  }

  async findOne(id: number): Promise<StatusResponse<any>> {
    try {
      const rol = await this.rolRepository.findOne({ where: { id } });
      if (!rol) {
        return new StatusResponse(false, 404, 'Rol no encontrada', null);
      }
      return new StatusResponse(true, 200, 'Rol encontrada', rol);
    } catch (error) {
      return new StatusResponse(false, 500, 'Error al obtener opción', error);
    }
  }

  async create(dto: CreateUpdateRolDto, usuario: string, ip: string): Promise<StatusResponse<any>> {
    try {
      const rol = this.rolRepository.create({
        ...dto,
        usuarioRegistro: usuario,
        ipRegistro: ip,
      });
      const saved = await this.rolRepository.save(rol);
      return new StatusResponse(true, 201, 'Acción creada', saved);
    } catch (error) {
      return new StatusResponse(false, 500, 'Error al crear acción', error);
    }
  }


  async update(id: number, dto: CreateUpdateRolDto, usuario: string, ip: string): Promise<StatusResponse<any>> {
    try {
      const rol = await this.rolRepository.findOne({ where: { id } });
      if (!rol) {
        return new StatusResponse(false, 404, 'Acción no encontrada', null);
      }
      // En servicio
      const rolPlano = {
        ...dto,
        usuarioModificacion: usuario,
        ipModificacion: ip,
        fechaModificacion: new Date(),
      };

      await this.rolRepository.update(id, rolPlano);

      const updated = await this.rolRepository.findOne({ where: { id } });
      return new StatusResponse(true, 200, 'Acción actualizada', updated);
    } catch (error) {
      return new StatusResponse(false, 500, 'Error al actualizar acción', error);
    }
  }

  async delete(id: number, usuario: string, ip: string): Promise<StatusResponse<any>> {
    try {
      const rol = await this.rolRepository.findOne({ where: { id } });
      if (!rol) {
        return new StatusResponse(false, 404, 'Acción no encontrada', null);
      }

      rol.usuarioEliminacion = usuario;
      rol.ipEliminacion = ip;
      rol.fechaEliminacion = new Date();

      await this.rolRepository.save(rol);
      await this.rolRepository.remove(rol);

      return new StatusResponse(true, 200, 'Acción eliminada', rol);
    } catch (error) {
      return new StatusResponse(false, 500, 'Error al eliminar acción', error);
    }
  }

  async deleteMany(ids: number[], usuario: string, ip: string): Promise<StatusResponse<any>> {
    try {
      const roles = await this.rolRepository.findBy({ id: In(ids) });

      if (!roles.length) {
        return new StatusResponse(false, 404, 'No se encontraron roles para eliminar', null);
      }

      // Actualizar campos de auditoría antes de eliminar
      const auditadas = roles.map((rol) => {
        rol.usuarioEliminacion = usuario;
        rol.ipEliminacion = ip;
        rol.fechaEliminacion = new Date();
        return rol;
      });

      // Primero guardamos los cambios de auditoría
      await this.rolRepository.save(auditadas);

      // Luego eliminamos
      await this.rolRepository.remove(auditadas);

      return new StatusResponse(true, 200, 'Roles eliminadas', ids);
    } catch (error) {
      return new StatusResponse(false, 500, 'Error al eliminar múltiples roles', error);
    }
  }

}
