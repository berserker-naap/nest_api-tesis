import { Injectable } from '@nestjs/common';
import { Usuario } from '../entities/usuario.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StatusResponseDto } from 'src/common/dto/response.dto';
import { CreateUpdateUsuarioDto, CreateUsuarioWithPersonaDto } from '../dto/usuario.dto';
import { Persona } from '../entities/persona.entity';


@Injectable()
export class UsuarioService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(Persona)
    private readonly personaRepository: Repository<Persona>,
  ) {}

  async create(
    createUsuarioDto: CreateUpdateUsuarioDto,
  ): Promise<StatusResponseDto<any>> {
    try {
      const usuario = this.usuarioRepository.create({
        ...createUsuarioDto,
      });

      await this.usuarioRepository.save(usuario);
      return new StatusResponseDto(true, 200, 'Usuario creado', usuario);
    } catch (error) {
      return new StatusResponseDto(false, 500, 'Error al crear usuario', error);
    }
  }

  async createUsuarioWithPersona(dto: CreateUsuarioWithPersonaDto, ip: string): Promise<StatusResponseDto<any>> {
    try {
      // 1. Crear Persona
      const persona = this.personaRepository.create({
        nombre: dto.nombre,
        apellido: dto.apellido,
        idTipoDocumentoIdentidad: dto.idTipoDocumentoIdentidad,
        documentoIdentidad: dto.documentoIdentidad,
        fechaNacimiento: dto.fechaNacimiento,
        ipRegistro: ip,
        usuarioRegistro: dto.usuarioRegistro,
      });
      await this.personaRepository.save(persona);

      // 2. Crear Usuario asociado a Persona
      const usuario = this.usuarioRepository.create({
        login: dto.login,
        password: dto.password,
        persona: persona,
        ipRegistro: ip,
        usuarioRegistro: dto.usuarioRegistro,
      });
      await this.usuarioRepository.save(usuario);

      return new StatusResponseDto(true, 200, 'Usuario creados', usuario);
    } catch (error) {
      return new StatusResponseDto(false, 500, 'Error al crear usuario y persona', error);
    }
  }

  // Obtener todos los usuarios
  async findAll(): Promise<StatusResponseDto<any>> {
    try {
      const usuarios = await this.usuarioRepository.find();
      return new StatusResponseDto(true, 200, 'Usuarios obtenidos', usuarios);
    } catch (error) {
      return new StatusResponseDto(
        false,
        500,
        'Error al obtener usuarios',
        error,
      );
    }
  }

  // Obtener un usuario por ID
  async findOne(id: number): Promise<StatusResponseDto<any>> {
    try {
      const usuario = await this.usuarioRepository.findOne({ where: { id } });
      if (!usuario) {
        return new StatusResponseDto(false, 404, 'Usuario no encontrado', null);
      }
      return new StatusResponseDto(true, 200, 'Usuario encontrado', usuario);
    } catch (error) {
      return new StatusResponseDto(
        false,
        500,
        'Error al obtener usuario',
        error,
      );
    }
  }

  // Actualizar un Usuario
  async update(
    id: number,
    updateUsuarioDto: CreateUpdateUsuarioDto,
  ): Promise<StatusResponseDto<any>> {
    try {
        const usuario = await this.usuarioRepository.findOne({ where: { id } });
      if (!usuario) {
        return new StatusResponseDto(false, 404, 'Usuario no encontrado', null);
      }

      // Actualizamos el usuario
      await this.usuarioRepository.update(id, updateUsuarioDto);
      const updatedUsuario = await this.usuarioRepository.findOne({ where: { id } });

      return new StatusResponseDto(
        true,
        200,
        'Usuario actualizado',
        updatedUsuario,
      );
    } catch (error) {
      return new StatusResponseDto(
        false,
        500,
        'Error al actualizar usuario',
        error,
      );
    }
  }

  // Eliminar un Usuario (solo actualizando la propiedad `eliminado`)
  async delete(id: number): Promise<StatusResponseDto<any>> {
    try {
      const usuario = await this.usuarioRepository.findOne({ where: { id } });
      if (!usuario) {
        return new StatusResponseDto(false, 404, 'Usuario no encontrado', null);
      }

      // Actualizamos la propiedad `eliminado` a true
      usuario.eliminado = true;
      await this.usuarioRepository.save(usuario);

      return new StatusResponseDto(true, 200, 'Usuario eliminado', usuario);
    } catch (error) {
      return new StatusResponseDto(
        false,
        500,
        'Error al eliminar usuario',
        error,
      );
    }
  }

  // Activar o Desactivar un Usuario (actualizando la propiedad `activo`)
  async activate(id: number, activo: boolean): Promise<StatusResponseDto<any>> {
    try {
      const usuario = await this.usuarioRepository.findOne({ where: { id } });
      if (!usuario) {
        return new StatusResponseDto(false, 404, 'Usuario no encontrado', null);
      }

      // Actualizamos la propiedad `activo`
      usuario.activo = activo;
      await this.usuarioRepository.save(usuario);

      return new StatusResponseDto(
        true,
        200,
        `Usuario ${activo ? 'activado' : 'desactivado'}`,
        usuario,
      );
    } catch (error) {
      return new StatusResponseDto(
        false,
        500,
        'Error al actualizar el estado del usuario',
        error,
      );
    }
  }
}
