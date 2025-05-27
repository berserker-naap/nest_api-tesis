import { AsignarUsuarioRolesDto, CreateUsuarioDto } from './../dto/usuario.dto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Usuario } from '../entities/usuario.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { StatusResponseDto } from 'src/common/dto/response.dto';
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



  async findAll(): Promise<StatusResponseDto<any>> {
    try {
      const usuarios = await this.usuarioRepository.find({
        relations: ['persona', 'roles', 'roles.rol'],
      });
      return new StatusResponseDto(true, 200, 'Acciones obtenidas', usuarios);
    } catch (error) {
      return new StatusResponseDto(false, 500, 'Error al obtener acciones', error);
    }
  }

  async create(dto: CreateUsuarioDto, usuarioRegistro: string, ip: string): Promise<StatusResponseDto<any>> {
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

      return new StatusResponseDto(true, 201, 'Usuario registrado', saved);
    } catch (error) {
      return new StatusResponseDto(false, 500, 'Error al crear acción', error);
    }
  }

  async asignarRoles(idUsuario: number, dto: AsignarUsuarioRolesDto, usuarioUpdate: string, ip: string): Promise<StatusResponseDto<any>> {
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

      return new StatusResponseDto(true, 200, 'Roles asignados correctamente');
    } catch (error) {
      return new StatusResponseDto(false, 500, 'Error al crear acción', error);
    }
  }


  // Activar o Desactivar un Usuario (actualizando la propiedad `activo`)
  async activate(id: number, activo: boolean, usuarioUpdate: string, ip: string): Promise<StatusResponseDto<any>> {
    try {
      const usuario = await this.usuarioRepository.findOne({ where: { id } });
      if (!usuario) {
        return new StatusResponseDto(false, 404, 'Usuario no encontrado', null);
      }

      // Actualizamos la propiedad `activo`
      usuario.activo = activo;
      await this.usuarioRepository.save({
        usuario,
        usuarioModificacion: usuarioUpdate,
        ipModificacion: ip,
        fechaModificacion: new Date(),
      });

      return new StatusResponseDto(true, 200, `Usuario ${activo ? 'activado' : 'desactivado'}`, usuario);
    } catch (error) {
      return new StatusResponseDto(
        false, 500, 'Error al actualizar el estado del usuario', error);
    }
  }
}
