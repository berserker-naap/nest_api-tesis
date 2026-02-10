import { CreateUsuarioDto, UpdateUsuarioDto, UsuarioResponseDto } from '../dto/usuario.dto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Usuario } from '../entities/usuario.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { StatusResponse } from 'src/common/dto/response.dto';
import { Persona } from '../entities/persona.entity';
import { UsuarioRol } from '../entities/usuario-rol.entity';
import { Rol } from '../entities/rol.entity';

import * as bcrypt from 'bcrypt';
@Injectable()
export class UsuarioService {
  constructor(
    @InjectRepository(UsuarioRol)
    private readonly usuarioRolRepository: Repository<UsuarioRol>,
    @InjectRepository(Rol)
    private readonly rolRepository: Repository<Rol>,

    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(Persona)
    private readonly personaRepository: Repository<Persona>,

    private readonly dataSource: DataSource,
  ) { }

  async findAll(): Promise<StatusResponse<UsuarioResponseDto[] | any>> {
    try {
      const usuarios = await this.usuarioRepository.find({
        where: {
          activo: true,
          eliminado: false,
        },
        relations: ['persona', 'roles', 'roles.rol'],
      });

      const usuariosDto: UsuarioResponseDto[] = usuarios.map((usuario) => ({
        id: usuario.id,
        login: usuario.login,
        persona: usuario.persona
          ? {
            id: usuario.persona.id,
            nombre: usuario.persona.nombre,
            apellido: usuario.persona.apellido,
          }
          : null,
        roles: (usuario.roles || [])
          .filter((ur) => ur.rol?.activo && !ur.rol?.eliminado)
          .map((ur) => ({
            id: ur.rol.id,
            nombre: ur.rol.nombre,
          })),
      }));

      return new StatusResponse(true, 200, 'Usuarios obtenidos', usuariosDto);
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
      return new StatusResponse(false, 500, 'Error al obtener usuarios', error);
    }
  }
  async create(
    dto: CreateUsuarioDto,
    usuarioRegistro: string,
    ip: string,
  ): Promise<StatusResponse<UsuarioResponseDto | any>> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      let persona;
      if (dto.persona?.id) {
        persona = await queryRunner.manager.findOne(Persona, {
          where: { id: dto.persona.id },
        });
        if (!persona) throw new NotFoundException('Persona no encontrada');
      } else if (dto.persona) {
        persona = queryRunner.manager.create(Persona, {
          ...dto.persona,
          usuarioRegistro,
          ipRegistro: ip,
        });
        persona = await queryRunner.manager.save(Persona, persona);
      } else {
        throw new BadRequestException('Debe enviar persona para el usuario');
      }

      const usuario = queryRunner.manager.create(Usuario, {
        login: dto.login,
        password: bcrypt.hashSync(dto.password, 10),
        persona,
        usuarioRegistro,
        ipRegistro: ip,
      });
      const saved = await queryRunner.manager.save(Usuario, usuario);

      const roleIds: number[] = dto.roles?.map((r) => r.id) ?? [];
      const roles = await this.rolRepository.findBy({
        id: In(roleIds),
      });
      const usuarioRoles = roles.map((rol) =>
        queryRunner.manager.create(UsuarioRol, {
          usuario: saved,
          rol,
          usuarioRegistro,
          ipRegistro: ip,
        }),
      );
      await queryRunner.manager.save(UsuarioRol, usuarioRoles);

      // Volver a cargar el usuario con relaciones actualizadas
      const usuarioCompleto = await queryRunner.manager.findOne(Usuario, {
        where: { id: saved.id },
        relations: ['persona', 'roles', 'roles.rol'],
      });

      await queryRunner.commitTransaction();

      if (!usuarioCompleto) {
        throw new NotFoundException('Error al obtener el usuario creado');
      }

      const usuarioDto: UsuarioResponseDto = {
        id: usuarioCompleto.id,
        login: usuarioCompleto.login,
        persona: usuarioCompleto.persona
          ? {
            id: usuarioCompleto.persona.id,
            nombre: usuarioCompleto.persona.nombre,
            apellido: usuarioCompleto.persona.apellido,
          }
          : null,
        roles: (usuarioCompleto.roles || [])
          .filter((ur) => ur.rol?.activo && !ur.rol?.eliminado)
          .map((ur) => ({
            id: ur.rol.id,
            nombre: ur.rol.nombre,
          })),
      };

      return new StatusResponse(true, 201, 'Usuario registrado', usuarioDto);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Error al crear usuario:', error);
      return new StatusResponse(false, 500, 'Error al crear usuario', error);
    } finally {
      await queryRunner.release();
    }
  }
  async update(
    id: number,
    dto: UpdateUsuarioDto,
    usuarioModificacion: string,
    ip: string,
  ): Promise<StatusResponse<any>> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Obtener usuario existente
      const usuarioExistente = await queryRunner.manager.findOne(Usuario, {
        where: { id },
        relations: ['persona', 'roles', 'roles.rol'],
      });

      if (!usuarioExistente) {
        throw new NotFoundException('Usuario no encontrado');
      }

      // 2. Manejo de persona
      let persona = usuarioExistente.persona;

      if (dto.persona?.id) {
        persona = await this.personaRepository.findOne({
          where: { id: dto.persona.id, activo: true, eliminado: false },
        });
        if (!persona) {
          throw new NotFoundException('Persona no encontrada');
        }
      } else if (dto.persona && !dto.persona.id) {
        persona = queryRunner.manager.create(Persona, {
          ...dto.persona,
          usuarioRegistro: usuarioModificacion,
          ipRegistro: ip,
        });
        persona = await queryRunner.manager.save(Persona, persona);
      }

      // 3. Actualizar usuario
      usuarioExistente.login = dto.login ?? usuarioExistente.login;
      usuarioExistente.persona = persona;
      usuarioExistente.usuarioModificacion = usuarioModificacion;
      usuarioExistente.ipModificacion = ip;

      if (dto.password) {
        usuarioExistente.password = bcrypt.hashSync(dto.password, 10);
      }

      await queryRunner.manager.save(Usuario, usuarioExistente);

      // 4. Actualizar roles (estrategia: eliminar y volver a insertar)
      if (dto.roles) {
        // 4.1 Eliminar roles actuales
        await queryRunner.manager.delete(UsuarioRol, {
          usuario: { id: usuarioExistente.id },
        });

        // 4.2 Obtener roles nuevos
        const roleIds: number[] = dto.roles.map((r) => r.id);
        const roles = await this.rolRepository.findBy({
          id: In(roleIds),
        });

        // 4.3 Crear nuevas relaciones
        const usuarioRoles = roles.map((rol) =>
          queryRunner.manager.create(UsuarioRol, {
            usuario: usuarioExistente,
            rol,
            usuarioRegistro: usuarioModificacion,
            ipRegistro: ip,
          }),
        );

        await queryRunner.manager.save(UsuarioRol, usuarioRoles);
      }

      // 5. Recargar usuario completo
      const usuarioCompleto = await queryRunner.manager.findOne(Usuario, {
        where: { id: usuarioExistente.id },
        relations: ['persona', 'roles', 'roles.rol'],
      });

      await queryRunner.commitTransaction();

      if (!usuarioCompleto) {
        throw new NotFoundException('Error al obtener el usuario actualizado');
      }

      return new StatusResponse(
        true,
        200,
        'Usuario actualizado correctamente',
        {
          id: usuarioCompleto.id,
          login: usuarioCompleto.login,
          persona: usuarioCompleto.persona
            ? {
              id: usuarioCompleto.persona.id,
              nombre: usuarioCompleto.persona.nombre,
              apellido: usuarioCompleto.persona.apellido,
            }
            : null,
          roles: (usuarioCompleto.roles || [])
            .filter((ur) => ur.rol?.activo && !ur.rol?.eliminado)
            .map((ur) => ({
              id: ur.rol.id,
              nombre: ur.rol.nombre,
            })),
        },
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Error al actualizar usuario:', error);
      return new StatusResponse(
        false,
        500,
        'Error al actualizar usuario',
        error,
      );
    } finally {
      await queryRunner.release();
    }
  }

  async findOne(id: number): Promise<StatusResponse<UsuarioResponseDto | any>> {
    try {
      const usuario = await this.usuarioRepository.findOne({
        where: { id, activo: true, eliminado: false },
        relations: ['persona', 'roles', 'roles.rol'],
      });

      if (!usuario) {
        return new StatusResponse(false, 404, 'Usuario no encontrado', null);
      }

      const usuarioDto: UsuarioResponseDto = {
        id: usuario.id,
        login: usuario.login,
        persona: usuario.persona
          ? {
              id: usuario.persona.id,
              nombre: usuario.persona.nombre,
              apellido: usuario.persona.apellido,
            }
          : null,
        roles: (usuario.roles || [])
          .filter((ur) => ur.rol?.activo && !ur.rol?.eliminado)
          .map((ur) => ({
            id: ur.rol.id,
            nombre: ur.rol.nombre,
          })),
      };

      return new StatusResponse(true, 200, 'Usuario encontrado', usuarioDto);
    } catch (error) {
      console.error('Error al obtener usuario:', error);
      return new StatusResponse(false, 500, 'Error al obtener usuario', error);
    }
  }

  async delete(
    id: number,
    usuario: string,
    ip: string,
  ): Promise<StatusResponse<any>> {
    try {
      const usuarioExistente = await this.usuarioRepository.findOne({
        where: { id, activo: true, eliminado: false },
      });

      if (!usuarioExistente) {
        return new StatusResponse(false, 404, 'Usuario no encontrado', null);
      }

      usuarioExistente.activo = false;
      usuarioExistente.eliminado = true;
      usuarioExistente.usuarioEliminacion = usuario;
      usuarioExistente.ipEliminacion = ip;
      usuarioExistente.fechaEliminacion = new Date();

      await this.usuarioRepository.save(usuarioExistente);

      return new StatusResponse(true, 200, 'Usuario eliminado', null);
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      return new StatusResponse(false, 500, 'Error al eliminar usuario', error);
    }
  }

  async deleteMany(
    ids: number[],
    usuario: string,
    ip: string,
  ): Promise<StatusResponse<any>> {
    try {
      const usuarios = await this.usuarioRepository.findBy({
        id: In(ids),
        activo: true,
        eliminado: false,
      });

      if (!usuarios.length) {
        return new StatusResponse(
          false,
          404,
          'No se encontraron usuarios para eliminar',
          null,
        );
      }

      const auditados = usuarios.map((usuarioItem) => {
        usuarioItem.activo = false;
        usuarioItem.eliminado = true;
        usuarioItem.usuarioEliminacion = usuario;
        usuarioItem.ipEliminacion = ip;
        usuarioItem.fechaEliminacion = new Date();
        return usuarioItem;
      });

      await this.usuarioRepository.save(auditados);

      return new StatusResponse(true, 200, 'Usuarios eliminados', null);
    } catch (error) {
      console.error('Error al eliminar múltiples usuarios:', error);
      return new StatusResponse(
        false,
        500,
        'Error al eliminar múltiples usuarios',
        error,
      );
    }
  }
}
