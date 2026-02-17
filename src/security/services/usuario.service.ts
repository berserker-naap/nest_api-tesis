import {
  AsignarUsuarioRolesDto,
  CreateUsuarioDto,
  UpdateUsuarioDto,
  UsuarioResponseDto,
} from '../dto/usuario.dto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Usuario } from '../entities/usuario.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { StatusResponse } from 'src/common/dto/response.dto';
import { Profile } from '../entities/profile.entity';
import { UsuarioRol } from '../entities/usuario-rol.entity';
import { Rol } from '../entities/rol.entity';
import { Multitabla } from 'src/businessparam/entities/multitabla.entity';

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
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,

    private readonly dataSource: DataSource,
  ) { }

  async findAll(): Promise<StatusResponse<UsuarioResponseDto[] | any>> {
    try {
      const usuarios = await this.usuarioRepository.find({
        where: {
          activo: true,
          eliminado: false,
        },
        relations: ['profile', 'profile.tipoDocumento', 'roles', 'roles.rol'],
      });

      const usuariosDto: UsuarioResponseDto[] = usuarios.map((usuario) => ({
        id: usuario.id,
        login: usuario.login,
        profile: usuario.profile
          ? {
            id: usuario.profile.id,
            nombre: usuario.profile.nombre,
            apellido: usuario.profile.apellido,
            documentoIdentidad: usuario.profile.documentoIdentidad,
            fechaNacimiento: usuario.profile.fechaNacimiento,
            tipoDocumento: usuario.profile.tipoDocumento
              ? {
                id: usuario.profile.tipoDocumento.id,
                nombre: usuario.profile.tipoDocumento.nombre,
                valor: usuario.profile.tipoDocumento.valor,
              }
              : null,
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
      let profile;
      if (dto.idProfile) {
        profile = await queryRunner.manager.findOne(Profile, {
          where: { id: dto.idProfile },
        });
        if (!profile) throw new NotFoundException('Profile no encontrada');
      } else if (dto.profile) {
        // Buscar tipo documento si se está creando una persona
        const tipoDocumento = await queryRunner.manager.findOne(Multitabla, {
          where: { id: dto.profile.idTipoDocumentoIdentidad },
        });
        if (!tipoDocumento)
          throw new BadRequestException('Tipo de documento no encontrado');

        profile = queryRunner.manager.create(Profile, {
          ...dto.profile,
          tipoDocumento,
          usuarioRegistro,
          ipRegistro: ip,
        });
        profile = await queryRunner.manager.save(Profile, profile);
      } else {
        throw new BadRequestException(
          'Debe enviar idProfile o un objeto persona para crear el usuario',
        );
      }

      const usuario = queryRunner.manager.create(Usuario, {
        login: dto.login,
        password: bcrypt.hashSync(dto.password, 10),
        profile,
        usuarioRegistro,
        ipRegistro: ip,
      });
      const saved = await queryRunner.manager.save(Usuario, usuario);

      const roleIds: number[] = dto.roles?.map((r) => r.id) ?? [];
      const roles = await this.rolRepository.findBy({
        id: In(roleIds),
        activo: true,
        eliminado: false,
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
        relations: ['profile', 'profile.tipoDocumento', 'roles', 'roles.rol'],
      });

      await queryRunner.commitTransaction();

      if (!usuarioCompleto) {
        throw new NotFoundException('Error al obtener el usuario creado');
      }

      const usuarioDto: UsuarioResponseDto = {
        id: usuarioCompleto.id,
        login: usuarioCompleto.login,
        profile: usuarioCompleto.profile
          ? {
            id: usuarioCompleto.profile.id,
            nombre: usuarioCompleto.profile.nombre,
            apellido: usuarioCompleto.profile.apellido,
            documentoIdentidad: usuarioCompleto.profile.documentoIdentidad,
            fechaNacimiento: usuarioCompleto.profile.fechaNacimiento,
            tipoDocumento: usuarioCompleto.profile.tipoDocumento
              ? {
                id: usuarioCompleto.profile.tipoDocumento.id,
                nombre: usuarioCompleto.profile.tipoDocumento.nombre,
                valor: usuarioCompleto.profile.tipoDocumento.valor,
              }
              : null,
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
  ): Promise<StatusResponse<UsuarioResponseDto | any>> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Obtener usuario existente
      const usuarioExistente = await queryRunner.manager.findOne(Usuario, {
        where: { id },
        relations: ['profile', 'profile.tipoDocumento', 'roles', 'roles.rol'],
      });

      if (!usuarioExistente) {
        throw new NotFoundException('Usuario no encontrado');
      }

      // 2. Manejo de persona
      let profile = usuarioExistente.profile;

      if (dto.idProfile) {
        profile = await this.profileRepository.findOne({
          where: { id: dto.idProfile, activo: true, eliminado: false },
        });
        if (!profile) {
          throw new NotFoundException('Profile no encontrada');
        }
      } else if (dto.profile) {
        const tipoDocumento = await queryRunner.manager.findOne(Multitabla, {
          where: { id: dto.profile.idTipoDocumentoIdentidad },
        });
        if (!tipoDocumento)
          throw new BadRequestException('Tipo de documento no encontrado');

        profile = queryRunner.manager.create(Profile, {
          ...dto.profile,
          tipoDocumento,
          usuarioRegistro: usuarioModificacion,
          ipRegistro: ip,
        });
        profile = await queryRunner.manager.save(Profile, profile);
      }

      // 3. Actualizar usuario
      usuarioExistente.login = dto.login ?? usuarioExistente.login;
      usuarioExistente.profile = profile;
      usuarioExistente.usuarioModificacion = usuarioModificacion;
      usuarioExistente.ipModificacion = ip;

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
          activo: true,
          eliminado: false,
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
        relations: ['profile', 'profile.tipoDocumento', 'roles', 'roles.rol'],
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
          profile: usuarioCompleto.profile
            ? {
              id: usuarioCompleto.profile.id,
              nombre: usuarioCompleto.profile.nombre,
              apellido: usuarioCompleto.profile.apellido,
              documentoIdentidad: usuarioCompleto.profile.documentoIdentidad,
              fechaNacimiento: usuarioCompleto.profile.fechaNacimiento,
              tipoDocumento: usuarioCompleto.profile.tipoDocumento
                ? {
                  id: usuarioCompleto.profile.tipoDocumento.id,
                  nombre: usuarioCompleto.profile.tipoDocumento.nombre,
                  valor: usuarioCompleto.profile.tipoDocumento.valor,
                }
                : null,
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
        relations: ['profile', 'profile.tipoDocumento', 'roles', 'roles.rol'],
      });

      if (!usuario) {
        return new StatusResponse(false, 404, 'Usuario no encontrado', null);
      }

      const usuarioDto: UsuarioResponseDto = {
        id: usuario.id,
        login: usuario.login,
        profile: usuario.profile
          ? {
            id: usuario.profile.id,
            nombre: usuario.profile.nombre,
            apellido: usuario.profile.apellido,
            documentoIdentidad: usuario.profile.documentoIdentidad,
            fechaNacimiento: usuario.profile.fechaNacimiento,
            tipoDocumento: usuario.profile.tipoDocumento
              ? {
                id: usuario.profile.tipoDocumento.id,
                nombre: usuario.profile.tipoDocumento.nombre,
                valor: usuario.profile.tipoDocumento.valor,
              }
              : null,
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

  async updateRoles(
    idUsuario: number,
    dto: AsignarUsuarioRolesDto,
    usuarioModificacion: string,
    ip: string,
  ): Promise<StatusResponse<UsuarioResponseDto | any>> {

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {

      const usuario = await queryRunner.manager.findOne(Usuario, {
        where: { id: idUsuario, activo: true, eliminado: false },
        relations: ['profile', 'profile.tipoDocumento', 'roles', 'roles.rol'],
      });

      if (!usuario)
        throw new NotFoundException('Usuario no encontrado');

      const roleIds = (dto.roles ?? []).map(r => r.id);

      if (!roleIds.length)
        throw new BadRequestException('Debe asignar al menos un rol');

      // Validar roles existentes
      const roles = await queryRunner.manager.find(Rol, {
        where: { id: In(roleIds), activo: true, eliminado: false },
      });

      if (roles.length !== roleIds.length) {
        const found = new Set(roles.map(r => r.id));
        const missing = roleIds.filter(id => !found.has(id));
        throw new BadRequestException(
          `Roles no encontrados o inactivos: ${missing.join(', ')}`
        );
      }

      // 🔥 Estrategia replace (igual que tu update actual)
      await queryRunner.manager.delete(UsuarioRol, {
        usuario: { id: idUsuario },
      });

      const usuarioRoles = roles.map(rol =>
        queryRunner.manager.create(UsuarioRol, {
          usuario,
          rol,
          usuarioRegistro: usuarioModificacion,
          ipRegistro: ip,
        }),
      );

      await queryRunner.manager.save(UsuarioRol, usuarioRoles);

      // Recargar usuario actualizado
      const usuarioCompleto = await queryRunner.manager.findOne(Usuario, {
        where: { id: idUsuario },
        relations: ['profile', 'profile.tipoDocumento', 'roles', 'roles.rol'],
      });

      await queryRunner.commitTransaction();

      if (!usuarioCompleto)
        throw new NotFoundException('Error al obtener usuario actualizado');

      // 🔥 MAPEO EXACTO A UsuarioResponseDto
      const usuarioDto: UsuarioResponseDto = {
        id: usuarioCompleto.id,
        login: usuarioCompleto.login,
        profile: usuarioCompleto.profile
          ? {
            id: usuarioCompleto.profile.id,
            nombre: usuarioCompleto.profile.nombre,
            apellido: usuarioCompleto.profile.apellido,
            documentoIdentidad: usuarioCompleto.profile.documentoIdentidad,
            fechaNacimiento: usuarioCompleto.profile.fechaNacimiento,
            tipoDocumento: usuarioCompleto.profile.tipoDocumento
              ? {
                id: usuarioCompleto.profile.tipoDocumento.id,
                nombre: usuarioCompleto.profile.tipoDocumento.nombre,
                valor: usuarioCompleto.profile.tipoDocumento.valor,
              }
              : null,
          }
          : null,
        roles: (usuarioCompleto.roles || [])
          .filter(ur => ur.rol?.activo && !ur.rol?.eliminado)
          .map(ur => ({
            id: ur.rol.id,
            nombre: ur.rol.nombre,
          })),
      };

      return new StatusResponse(
        true,
        200,
        'Roles actualizados correctamente',
        usuarioDto,
      );

    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Error al actualizar roles:', error);
      return new StatusResponse(
        false,
        500,
        'Error al actualizar roles',
        error,
      );
    } finally {
      await queryRunner.release();
    }
  }

  async resetPassword(
    id: number,
    usuarioModificacion: string,
    ip: string,
  ): Promise<StatusResponse<any>> {

    try {

      const usuario = await this.usuarioRepository.findOne({
        where: { id, activo: true, eliminado: false },
      });

      if (!usuario) {
        return new StatusResponse(
          false,
          404,
          'Usuario no encontrado',
          null,
        );
      }

      const defaultPassword = '123456';

      usuario.password = bcrypt.hashSync(defaultPassword, 10);
      usuario.usuarioModificacion = usuarioModificacion;
      usuario.ipModificacion = ip;
      usuario.fechaModificacion = new Date();

      await this.usuarioRepository.save(usuario);

      return new StatusResponse(
        true,
        200,
        'Contraseña restablecida correctamente',
        null,
      );

    } catch (error) {
      console.error('Error al resetear contraseña:', error);
      return new StatusResponse(
        false,
        500,
        'Error al resetear contraseña',
        error,
      );
    }
  }




}



