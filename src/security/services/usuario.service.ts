import { CreateUpdateUsuarioDto } from './../dto/usuario.dto';
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

  async findAll(): Promise<StatusResponse<CreateUpdateUsuarioDto[]>> {
    try {
      const usuarios = await this.usuarioRepository.find({
        where: {
          activo: true,
          eliminado: false,
        },
        relations: ['persona', 'roles', 'roles.rol'],
      });

      const usuariosDto: CreateUpdateUsuarioDto[] = usuarios.map((usuario) => ({
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
    dto: CreateUpdateUsuarioDto,
    usuarioRegistro: string,
    ip: string,
  ): Promise<StatusResponse<CreateUpdateUsuarioDto>> {
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

      const usuarioDto: CreateUpdateUsuarioDto = {
        id: usuarioCompleto.id,
        login: usuarioCompleto.login,
        password: null,
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
    dto: CreateUpdateUsuarioDto,
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

  // async asignarRoles(idUsuario: number, dto: AsignarUsuarioRolesDto, usuarioUpdate: string, ip: string): Promise<StatusResponse<any>> {
  //   try {
  //     const usuario = await this.usuarioRepository.findOneBy({ id: idUsuario });
  //     if (!usuario) throw new NotFoundException('Usuario no encontrado');

  //     // Eliminar roles anteriores
  //     await this.usuarioRolRepository.delete({ usuario: { id: idUsuario } });

  //     // Asignar nuevos
  //     const roles = await this.rolRepository.findBy({ id: In(dto.roles) });
  //     for (const rol of roles) {
  //       const rel = this.usuarioRolRepository.create({ usuario, rol });
  //       await this.usuarioRolRepository.save(
  //         {
  //           ...rel,
  //           usuarioModificacion: usuarioUpdate,
  //           ipModificacion: ip,
  //           fechaModificacion: new Date(),
  //         });
  //     }

  //     return new StatusResponse(true, 200, 'Roles asignados correctamente');
  //   } catch (error) {
  //     return new StatusResponse(false, 500, 'Error al crear acción', error);
  //   }
  // }

  // // Activar o Desactivar un Usuario (actualizando la propiedad `activo`)
  // async activate(id: number, activo: boolean, usuarioUpdate: string, ip: string): Promise<StatusResponse<any>> {
  //   try {
  //     const usuario = await this.usuarioRepository.findOne({ where: { id } });
  //     if (!usuario) {
  //       return new StatusResponse(false, 404, 'Usuario no encontrado', null);
  //     }

  //     // Actualizamos la propiedad `activo`
  //     usuario.activo = activo;
  //     await this.usuarioRepository.save({
  //       usuario,
  //       usuarioModificacion: usuarioUpdate,
  //       ipModificacion: ip,
  //       fechaModificacion: new Date(),
  //     });

  //     return new StatusResponse(true, 200, `Usuario ${activo ? 'activado' : 'desactivado'}`, usuario);
  //   } catch (error) {
  //     return new StatusResponse(
  //       false, 500, 'Error al actualizar el estado del usuario', error);
  //   }
  // }
}
