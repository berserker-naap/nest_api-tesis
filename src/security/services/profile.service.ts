import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StatusResponse } from 'src/common/dto/response.dto';
import { Multitabla } from 'src/businessparam/entities/multitabla.entity';
import { Profile } from '../entities/profile.entity';
import { ReniecData } from '../entities/reniec-data.entity';
import { Usuario } from '../entities/usuario.entity';
import { Repository } from 'typeorm';
import { ProfileMeResponseDto, UpdateProfileCredentialsDto, UpdateProfileDataDto } from '../dto/profile.dto';
import * as bcrypt from 'bcrypt';
import { AuthService } from 'src/auth/auth.service';
import { SessionResponseDto } from 'src/auth/dto/auth.dto';
import { ProfileValidationStatus } from '../enums/profile-validation-status.enum';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
    @InjectRepository(ReniecData)
    private readonly reniecDataRepository: Repository<ReniecData>,
    @InjectRepository(Multitabla)
    private readonly multitablaRepository: Repository<Multitabla>,
    private readonly authService: AuthService,
  ) {}

  async me(usuarioRequest: Usuario): Promise<StatusResponse<ProfileMeResponseDto | null>> {
    try {
      const usuario = await this.usuarioRepository.findOne({
        where: { id: usuarioRequest.id, activo: true, eliminado: false },
        relations: ['profile', 'profile.tipoDocumento'],
      });

      if (!usuario) {
        throw new NotFoundException('Usuario no encontrado');
      }

      return new StatusResponse(
        true,
        200,
        'Perfil obtenido',
        usuario.profile
          ? {
              nombre: usuario.profile.nombre,
              apellido: usuario.profile.apellido,
              documentoIdentidad: usuario.profile.documentoIdentidad,
              fechaNacimiento: usuario.profile.fechaNacimiento,
              tipoDocumento: usuario.profile.tipoDocumento
                ? {
                    nombre: usuario.profile.tipoDocumento.nombre,
                    valor: usuario.profile.tipoDocumento.valor,
                  }
                : null,
              validacionEstado:
                usuario.profile.validacionEstado ?? ProfileValidationStatus.PENDING,
            }
          : null,
      );
    } catch (error) {
      return new StatusResponse(false, 500, 'Error al obtener perfil', null);
    }
  }

  async updateProfileData(
    usuarioRequest: Usuario,
    dto: UpdateProfileDataDto,
    ip: string,
  ): Promise<StatusResponse<ProfileMeResponseDto | null>> {
    try {
      const usuario = await this.usuarioRepository.findOne({
        where: { id: usuarioRequest.id, activo: true, eliminado: false },
        relations: ['profile'],
      });

      if (!usuario) {
        throw new NotFoundException('Usuario no encontrado');
      }

      if (!usuario.profile) {
        throw new NotFoundException('La cuenta no tiene un perfil asociado');
      }

      const tipoDocumento = await this.multitablaRepository.findOne({
        where: { id: dto.idTipoDocumentoIdentidad, activo: true, eliminado: false },
      });
      if (!tipoDocumento) {
        throw new BadRequestException('Tipo de documento no encontrado');
      }

      const profile = await this.profileRepository.findOne({
        where: { id: usuario.profile.id, activo: true, eliminado: false },
        relations: ['tipoDocumento', 'reniecData'],
      });
      if (!profile) {
        throw new NotFoundException('Perfil no encontrado');
      }

      profile.nombre = dto.nombre?.trim();
      profile.apellido = dto.apellido ? dto.apellido?.trim() : null;
      profile.documentoIdentidad = dto.documentoIdentidad;
      profile.fechaNacimiento = dto.fechaNacimiento ? new Date(dto.fechaNacimiento) : null;
      profile.tipoDocumento = tipoDocumento;
      const documento = (dto.documentoIdentidad ?? '').trim();
      if (tipoDocumento.id === 3 && /^\d{8}$/.test(documento)) {
        const reniecIdentity = await this.authService.resolveReniecIdentity(documento);
        if (!reniecIdentity) {
          profile.validacionEstado = ProfileValidationStatus.FAILED;
          profile.fechaVerificacion = null;
          profile.reniecData = null;
        } else {
          profile.reniecData = await this.reniecDataRepository.findOne({
            where: {
              idTipoDocumentoIdentidad: 3,
              numeroDocumento: reniecIdentity.numeroDocumento,
              activo: true,
              eliminado: false,
            },
          });
          profile.validacionEstado = this.resolveValidationStatus(
            profile.nombre,
            profile.apellido,
            reniecIdentity.nombres,
            reniecIdentity.apellidos,
          );
          profile.fechaVerificacion = new Date();
        }
      } else if (tipoDocumento.id === 3) {
        profile.validacionEstado = ProfileValidationStatus.FAILED;
        profile.fechaVerificacion = null;
        profile.reniecData = null;
      } else {
        profile.validacionEstado = ProfileValidationStatus.PENDING;
        profile.fechaVerificacion = null;
        profile.reniecData = null;
      }
      profile.usuarioModificacion = usuarioRequest.login;
      profile.ipModificacion = ip;
      profile.fechaModificacion = new Date();

      await this.profileRepository.save(profile);

      return new StatusResponse(true, 200, 'Datos personales actualizados', {
        nombre: profile.nombre,
        apellido: profile.apellido,
        documentoIdentidad: profile.documentoIdentidad,
        fechaNacimiento: profile.fechaNacimiento,
        tipoDocumento: {
          nombre: tipoDocumento.nombre,
          valor: tipoDocumento.valor,
        },
        validacionEstado: profile.validacionEstado,
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

  private resolveValidationStatus(
    profileNombre: string,
    profileApellido: string | null,
    reniecNombre: string,
    reniecApellido: string,
  ): ProfileValidationStatus {
    const nombrePerfil = this.normalizeText(profileNombre);
    const apellidoPerfil = this.normalizeText(profileApellido ?? '');
    const nombreReniec = this.normalizeText(reniecNombre);
    const apellidoReniec = this.normalizeText(reniecApellido);

    if (nombrePerfil === nombreReniec && apellidoPerfil === apellidoReniec) {
      return ProfileValidationStatus.VERIFIED;
    }

    return ProfileValidationStatus.MISMATCH;
  }

  private normalizeText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  }
}


