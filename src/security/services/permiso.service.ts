import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StatusResponse } from 'src/common/dto/response.dto';
import { Repository } from 'typeorm';
import { PermisoBulkDto } from '../dto/permiso.dto';
import { Permiso } from '../entities/permiso.entity';
import { Accion } from '../entities/accion.entity';
import { Modulo } from '../entities/modulo.entity';

@Injectable()
export class PermisoService {
  constructor(
    @InjectRepository(Accion)
    private readonly accionRepository: Repository<Accion>,
    @InjectRepository(Modulo)
    private readonly moduloRepository: Repository<Modulo>,
    @InjectRepository(Permiso)
    private readonly permisoRepository: Repository<Permiso>,
  ) {}

  async getPermisosPorRol(idRol: number): Promise<StatusResponse<any>> {
    try {
      // 1. Obtener todas las acciones
      const acciones = await this.accionRepository.find({
        where: { activo: true, eliminado: false },
      });

      // 2. Obtener todos los módulos y sus opciones
      //* NOTA: eN TypeORM no puedes filtrar directamente las relaciones hijas (opciones) usando where en el mismo find del repositorio de módulos. El where solo aplica a la entidad principal (módulo), no a las entidades relacionadas (opciones).
      const modulos = await this.moduloRepository.find({
        relations: ['opciones'],
        order: { nombre: 'ASC' },
        where: { activo: true, eliminado: false },
      });

      // 3. Obtener permisos actuales del rol (solo ids necesarios)
      const permisosRol = await this.permisoRepository.find({
        where: {
          rol: { id: idRol },
          activo: true,
          eliminado: false,
        },
        relations: ['opcion', 'accion'],
        select: ['id', 'opcion', 'accion'],
      });

      // Creamos un Set para búsquedas rápidas
      const permisosSet = new Set(
        permisosRol.map((p) => `${p.opcion.id}-${p.accion.id}`)
      );

      // 4. Estructura de retorno (filtrando opciones activas y no eliminadas)
      const data = modulos.map((modulo) => ({
        id: modulo.id,
        nombre: modulo.nombre,
        opciones: (modulo.opciones || [])
          .filter(opcion => opcion.activo && !opcion.eliminado)
          .map((opcion) => ({
            id: opcion.id,
            nombre: opcion.nombre,
            acciones: acciones.map((accion) => ({
              id: accion.id,
              nombre: accion.nombre,
              asignado: permisosSet.has(`${opcion.id}-${accion.id}`),
            })),
          })),
      }));

      return new StatusResponse(true, 200, 'Permisos cargados', data);
    } catch (error) {
      return new StatusResponse(false, 500, 'Error al cargar permisos', error);
    }
  }

  async actualizarPermisos(
    dto: PermisoBulkDto[],
    usuario: string,
    ip: string,
  ): Promise<StatusResponse<any>> {
    try {
      for (const item of dto) {
        const existentePermiso = await this.permisoRepository.findOne({
          where: {
            rol: { id: item.idRol },
            opcion: { id: item.idOpcion },
            accion: { id: item.idAccion },
          },
        });

        if (item.asignado) {
          if (!existentePermiso) {
            // crear nuevo
            const nuevo = this.permisoRepository.create({
              rol: { id: item.idRol },
              opcion: { id: item.idOpcion },
              accion: { id: item.idAccion },
              activo: true,
              eliminado: false,
              usuarioRegistro: usuario,
              ipRegistro: ip,
            });
            await this.permisoRepository.save(nuevo);
          } else if (!existentePermiso.activo || existentePermiso.eliminado) {
            existentePermiso.activo = true;
            existentePermiso.eliminado = false;
            existentePermiso.usuarioModificacion = usuario;
            existentePermiso.ipModificacion = ip;
            existentePermiso.fechaModificacion = new Date();
            await this.permisoRepository.save(existentePermiso);
          }
        } else if (existentePermiso && existentePermiso.activo && !existentePermiso.eliminado) {
          // desactivar
          existentePermiso.activo = false;
          existentePermiso.eliminado = true;
          existentePermiso.usuarioEliminacion = usuario;
          existentePermiso.ipEliminacion = ip;
          existentePermiso.fechaEliminacion = new Date();
          await this.permisoRepository.save(existentePermiso);
        }
      }

      return new StatusResponse(true, 200, 'Permisos actualizados');
    } catch (error) {
      return new StatusResponse(
        false,
        500,
        'Error al actualizar permisos',
        error,
      );
    }
  }

  // async findAll(): Promise<StatusResponse<any>> {
  //   try {
  //     const permisos = await this.permisoRepository.find({
  //       relations: ['rol', 'opcion', 'opcion.modulo', 'accion'],
  //     });
  //     return new StatusResponse(true, 200, 'Permisos obtenidos', permisos);
  //   } catch (error) {
  //     return new StatusResponse(false, 500, 'Error al obtener permisos', error);
  //   }
  // }

  // async create(
  //   dto: CreatePermisoDto,
  //   usuario: string,
  //   ip: string,
  // ): Promise<StatusResponse<any>> {
  //   try {
  //     const permiso = this.permisoRepository.create({
  //       rol: { id: dto.idRol },
  //       opcion: { id: dto.idOpcion },
  //       accion: { id: dto.idAccion },
  //       usuarioRegistro: usuario,
  //       ipRegistro: ip,
  //     });
  //     const saved = await this.permisoRepository.save(permiso);
  //     return new StatusResponse(true, 201, 'Permiso creado', saved);
  //   } catch (error) {
  //     return new StatusResponse(false, 500, 'Error al crear permiso', error);
  //   }
  // }
}
