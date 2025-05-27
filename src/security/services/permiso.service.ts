import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StatusResponseDto } from 'src/common/dto/response.dto';
import { Repository } from 'typeorm';
import { CreatePermisoDto, PermisoBulkDto } from '../dto/permiso.dto';
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
  ) { }

  async getPermisosPorRol(idRol: number): Promise<StatusResponseDto<any>> {
    try {
      // 1. Obtener todas las acciones
      const acciones = await this.accionRepository.find();

      // 2. Obtener todos los módulos y sus opciones
      const modulos = await this.moduloRepository.find({
        relations: ['opciones'],
        order: { nombre: 'ASC' },
      });

      // 3. Obtener permisos actuales del rol
      const permisosRol = await this.permisoRepository.find({
        where: {
          rol: { id: idRol },
          activo: true,
          eliminado: false,
        },
        relations: ['opcion', 'accion', 'opcion.modulo'],
      });

      // 4. Estructura de retorno
      const data = modulos.map((modulo) => ({
        id: modulo.id,
        nombre: modulo.nombre,
        opciones: modulo.opciones.map((opcion) => ({
          id: opcion.id,
          nombre: opcion.nombre,
          acciones: acciones.map((accion) => {
            const tienePermiso = permisosRol.some(
              (p) => p.opcion.id === opcion.id && p.accion.id === accion.id,
            );
            return {
              id: accion.id,
              nombre: accion.nombre,
              asignado: tienePermiso,
            };
          }),
        })),
      }));

      return new StatusResponseDto(true, 200, 'Permisos cargados', data);
    } catch (error) {
      return new StatusResponseDto(
        false,
        500,
        'Error al cargar permisos',
        error,
      );
    }
  }

  async actualizarPermisos(dto: PermisoBulkDto[], usuario: string, ip: string): Promise<StatusResponseDto<any>> {
    try {
      for (const item of dto) {
        const existente = await this.permisoRepository.findOne({
          where: {
            rol: { id: item.idRol },
            opcion: { id: item.idOpcion },
            accion: { id: item.idAccion }
          }
        });

        if (item.asignado) {
          if (!existente) {
            // crear nuevo
            const nuevo = this.permisoRepository.create({
              rol: { id: item.idRol },
              opcion: { id: item.idOpcion },
              accion: { id: item.idAccion },
              activo: true,
              eliminado: false,
              usuarioRegistro: usuario,
              ipRegistro: ip
            });
            await this.permisoRepository.save(nuevo);
          } else if (!existente.activo || existente.eliminado) {
            existente.activo = true;
            existente.eliminado = false;
            existente.usuarioModificacion = usuario;
            existente.ipModificacion = ip;
            existente.fechaModificacion = new Date();
            await this.permisoRepository.save(existente);
          }
        } else if (existente && existente.activo && !existente.eliminado) {
          // desactivar
          existente.activo = false;
          existente.eliminado = true;
          existente.usuarioEliminacion = usuario;
          existente.ipEliminacion = ip;
          existente.fechaEliminacion = new Date();
          await this.permisoRepository.save(existente);
        }
      }

      return new StatusResponseDto(true, 200, 'Permisos actualizados');
    } catch (error) {
      return new StatusResponseDto(false, 500, 'Error al actualizar permisos', error);
    }
  }


  async findAll(): Promise<StatusResponseDto<any>> {
    try {
      const permisos = await this.permisoRepository.find({
        relations: ['rol', 'opcion', 'opcion.modulo', 'accion'],
      });
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

  async create(
    dto: CreatePermisoDto,
    usuario: string,
    ip: string,
  ): Promise<StatusResponseDto<any>> {
    try {
      const permiso = this.permisoRepository.create({
        rol: { id: dto.idRol },
        opcion: { id: dto.idOpcion },
        accion: { id: dto.idAccion },
        usuarioRegistro: usuario,
        ipRegistro: ip,
      });
      const saved = await this.permisoRepository.save(permiso);
      return new StatusResponseDto(true, 201, 'Permiso creado', saved);
    } catch (error) {
      return new StatusResponseDto(false, 500, 'Error al crear permiso', error);
    }
  }
}
