import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StatusResponse } from 'src/common/dto/response.dto';
import { Multitabla } from 'src/businessparam/entities/multitabla.entity';
import { Persona } from '../entities/persona.entity';
import { Usuario } from '../entities/usuario.entity';
import { Repository } from 'typeorm';
import { ProfileMeResponseDto, UpdateProfileCredentialsDto, UpdateProfilePersonaDto } from '../dto/profile.dto';
import * as bcrypt from 'bcrypt';
import { AuthService } from 'src/auth/auth.service';
import { SessionResponseDto } from 'src/auth/dto/auth.dto';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(Persona)
    private readonly personaRepository: Repository<Persona>,
    @InjectRepository(Multitabla)
    private readonly multitablaRepository: Repository<Multitabla>,
    private readonly authService: AuthService,
  ) {}

  async me(usuarioRequest: Usuario): Promise<StatusResponse<ProfileMeResponseDto | null>> {
    try {
      const usuario = await this.usuarioRepository.findOne({
        where: { id: usuarioRequest.id, activo: true, eliminado: false },
        relations: ['persona', 'persona.tipoDocumento'],
      });

      if (!usuario) {
        throw new NotFoundException('Usuario no encontrado');
      }

      return new StatusResponse(
        true,
        200,
        'Perfil obtenido',
        usuario.persona
          ? {
              nombre: usuario.persona.nombre,
              apellido: usuario.persona.apellido,
              documentoIdentidad: usuario.persona.documentoIdentidad,
              fechaNacimiento: usuario.persona.fechaNacimiento,
              tipoDocumento: usuario.persona.tipoDocumento
                ? {
                    nombre: usuario.persona.tipoDocumento.nombre,
                    valor: usuario.persona.tipoDocumento.valor,
                  }
                : null,
            }
          : null,
      );
    } catch (error) {
      return new StatusResponse(false, 500, 'Error al obtener perfil', null);
    }
  }

  async updatePersona(
    usuarioRequest: Usuario,
    dto: UpdateProfilePersonaDto,
    ip: string,
  ): Promise<StatusResponse<ProfileMeResponseDto | null>> {
    try {
      const usuario = await this.usuarioRepository.findOne({
        where: { id: usuarioRequest.id, activo: true, eliminado: false },
        relations: ['persona'],
      });

      if (!usuario) {
        throw new NotFoundException('Usuario no encontrado');
      }

      if (!usuario.persona) {
        throw new NotFoundException('La cuenta no tiene una persona asociada');
      }

      const tipoDocumento = await this.multitablaRepository.findOne({
        where: { id: dto.idTipoDocumentoIdentidad, activo: true, eliminado: false },
      });
      if (!tipoDocumento) {
        throw new BadRequestException('Tipo de documento no encontrado');
      }

      const persona = await this.personaRepository.findOne({
        where: { id: usuario.persona.id, activo: true, eliminado: false },
        relations: ['tipoDocumento'],
      });
      if (!persona) {
        throw new NotFoundException('Persona no encontrada');
      }

      persona.nombre = dto.nombre?.trim();
      persona.apellido = dto.apellido ? dto.apellido?.trim() : null;
      persona.documentoIdentidad = dto.documentoIdentidad;
      persona.fechaNacimiento = dto.fechaNacimiento ? new Date(dto.fechaNacimiento) : null;
      persona.tipoDocumento = tipoDocumento;
      persona.usuarioModificacion = usuarioRequest.login;
      persona.ipModificacion = ip;
      persona.fechaModificacion = new Date();

      await this.personaRepository.save(persona);

      return new StatusResponse(true, 200, 'Datos personales actualizados', {
        nombre: persona.nombre,
        apellido: persona.apellido,
        documentoIdentidad: persona.documentoIdentidad,
        fechaNacimiento: persona.fechaNacimiento,
        tipoDocumento: {
          nombre: tipoDocumento.nombre,
          valor: tipoDocumento.valor,
        },
      });
    } catch (error) {
      const statusCode =
        error instanceof BadRequestException || error instanceof NotFoundException
          ? error.getStatus()
          : 500;
      const message =
        error instanceof BadRequestException || error instanceof NotFoundException
          ? error.message
          : 'Error al actualizar datos personales';

      return new StatusResponse(false, statusCode, message, null);
    }
  }


  async updateCredentials(
    usuarioRequest: Usuario,
    dto: UpdateProfileCredentialsDto,
    ip: string,
  ): Promise<StatusResponse<SessionResponseDto | null>> {
    try {
      const usuario = await this.usuarioRepository.findOne({
        where: { id: usuarioRequest.id, activo: true, eliminado: false },
      });

      if (!usuario) {
        throw new NotFoundException('Usuario no encontrado');
      }

      const loginNormalizado = dto.login.trim().toLowerCase();
      const usuarioConMismoLogin = await this.usuarioRepository.findOne({
        where: { login: loginNormalizado, activo: true, eliminado: false },
      });

      if (usuarioConMismoLogin && usuarioConMismoLogin.id !== usuario.id) {
        throw new BadRequestException('El correo ingresado ya se encuentra en uso');
      }

      usuario.login = loginNormalizado;
      if (dto.password) {
        usuario.password = bcrypt.hashSync(dto.password, 10);
      }

      usuario.usuarioModificacion = usuarioRequest.login;
      usuario.ipModificacion = ip;
      usuario.fechaModificacion = new Date();

      await this.usuarioRepository.save(usuario);
      const session = await this.authService.buildSessionPayload(usuario.id, usuario.login);

      return new StatusResponse(true, 200, 'Credenciales actualizadas', session);
    } catch (error) {
      const statusCode =
        error instanceof BadRequestException || error instanceof NotFoundException
          ? error.getStatus()
          : 500;
      const message =
        error instanceof BadRequestException || error instanceof NotFoundException
          ? error.message
          : 'Error al actualizar credenciales';

      return new StatusResponse(false, statusCode, message, null);
    }
  }
}
