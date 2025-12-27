import { AsignarUsuarioRolesDto, CreateUsuarioDto, UsuarioResponseDto } from './../dto/usuario.dto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Usuario } from '../entities/usuario.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
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
  ) { }



  async findAll(): Promise<StatusResponse<UsuarioResponseDto[]>> {
    try {
      const usuarios = await this.usuarioRepository.find({
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

  async create(dto: CreateUsuarioDto, usuarioRegistro: string, ip: string): Promise<StatusResponse<UsuarioResponseDto>> {
    try {
      let persona;

      if (dto.idPersona) {
        persona = await this.personaRepository.findOneBy({ id: dto.idPersona });
        if (!persona) throw new NotFoundException('Persona no encontrada');
      } else if (dto.persona) {
        persona = this.personaRepository.create(dto.persona);
        persona = await this.personaRepository.save(persona);
      } else {
        throw new BadRequestException('Debe enviar persona o idPersona');
      }

      const usuario = this.usuarioRepository.create({
        login: dto.login,
        password: bcrypt.hashSync(dto.password, 10),
        persona,
      });

      const saved = await this.usuarioRepository.save(usuario);

      // Asignar roles
      const roles = await this.rolRepository.findBy({ id: In(dto.roles) });
      for (const rol of roles) {
        const rel = this.usuarioRolRepository.create({ usuario: saved, rol });
        await this.usuarioRolRepository.save({
          ...rel,
          usuarioRegistro: usuarioRegistro,
          ipRegistro: ip,
        });
      }

      // Volver a cargar el usuario con relaciones actualizadas
      const usuarioCompleto = await this.usuarioRepository.findOne({
        where: { id: saved.id },
        relations: ['persona', 'roles', 'roles.rol'],
      });
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
      console.error('Error al crear usuario:', error);
      return new StatusResponse(false, 500, 'Error al crear acción', error);
    }
  }


  async asignarRoles(idUsuario: number, dto: AsignarUsuarioRolesDto, usuarioUpdate: string, ip: string): Promise<StatusResponse<any>> {
    try {
      const usuario = await this.usuarioRepository.findOneBy({ id: idUsuario });
      if (!usuario) throw new NotFoundException('Usuario no encontrado');

      // Eliminar roles anteriores
      await this.usuarioRolRepository.delete({ usuario: { id: idUsuario } });

      // Asignar nuevos
      const roles = await this.rolRepository.findBy({ id: In(dto.roles) });
      for (const rol of roles) {
        const rel = this.usuarioRolRepository.create({ usuario, rol });
        await this.usuarioRolRepository.save(
          {
            ...rel,
            usuarioModificacion: usuarioUpdate,
            ipModificacion: ip,
            fechaModificacion: new Date(),
          });
      }

      return new StatusResponse(true, 200, 'Roles asignados correctamente');
    } catch (error) {
      return new StatusResponse(false, 500, 'Error al crear acción', error);
    }
  }


  // Activar o Desactivar un Usuario (actualizando la propiedad `activo`)
  async activate(id: number, activo: boolean, usuarioUpdate: string, ip: string): Promise<StatusResponse<any>> {
    try {
      const usuario = await this.usuarioRepository.findOne({ where: { id } });
      if (!usuario) {
        return new StatusResponse(false, 404, 'Usuario no encontrado', null);
      }

      // Actualizamos la propiedad `activo`
      usuario.activo = activo;
      await this.usuarioRepository.save({
        usuario,
        usuarioModificacion: usuarioUpdate,
        ipModificacion: ip,
        fechaModificacion: new Date(),
      });

      return new StatusResponse(true, 200, `Usuario ${activo ? 'activado' : 'desactivado'}`, usuario);
    } catch (error) {
      return new StatusResponse(
        false, 500, 'Error al actualizar el estado del usuario', error);
    }
  }
}
