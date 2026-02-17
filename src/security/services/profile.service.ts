import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { StatusResponse } from 'src/common/dto/response.dto';
import { BlobStorageService } from 'src/common/services/blob-storage.service';
import { UploadedFile } from 'src/common/types/uploaded-file.type';
import { Multitabla } from 'src/businessparam/entities/multitabla.entity';
import { ProfilePhone } from '../entities/profile-phone.entity';
import { Profile } from '../entities/profile.entity';
import { ReniecData } from '../entities/reniec-data.entity';
import { Usuario } from '../entities/usuario.entity';
import { Repository } from 'typeorm';
import {
  ProfileMeResponseDto,
  UpdateProfileDataDto,
} from '../dto/profile.dto';
import { AuthService } from 'src/auth/auth.service';
import { ProfileValidationStatus } from '../enums/profile-validation-status.enum';

@Injectable()
export class ProfileService {
  private readonly maxProfilePhotoSizeBytes: number;
  private readonly allowedProfilePhotoMimeTypes: Set<string>;

  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
    @InjectRepository(ProfilePhone)
    private readonly profilePhoneRepository: Repository<ProfilePhone>,
    @InjectRepository(ReniecData)
    private readonly reniecDataRepository: Repository<ReniecData>,
    @InjectRepository(Multitabla)
    private readonly multitablaRepository: Repository<Multitabla>,
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
    private readonly blobStorageService: BlobStorageService,
  ) {
    const maxSizeMb = Number(
      this.configService.get<string>('PROFILE_PHOTO_MAX_SIZE_MB') ?? '5',
    );
    this.maxProfilePhotoSizeBytes = maxSizeMb * 1024 * 1024;

    const rawMimeTypes =
      this.configService.get<string>('PROFILE_PHOTO_ALLOWED_MIME_TYPES') ??
      'image/jpeg,image/png,image/webp';
    this.allowedProfilePhotoMimeTypes = new Set(
      rawMimeTypes
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter((value) => value.length > 0),
    );
  }

  async me(
    usuarioRequest: Usuario,
  ): Promise<StatusResponse<ProfileMeResponseDto | null>> {
    try {
      const usuario = await this.usuarioRepository.findOne({
        where: { id: usuarioRequest.id, activo: true, eliminado: false },
        relations: ['profile', 'profile.tipoDocumento'],
      });

      if (!usuario) {
        throw new NotFoundException('Usuario no encontrado');
      }

      const profilePhones = await this.profilePhoneRepository.find({
        where: {
          profile: { id: usuario.profile!.id },
          activo: true,
          eliminado: false,
        },
        order: { fechaRegistro: 'DESC' },
      });

      return new StatusResponse(
        true,
        200,
        'Perfil obtenido',
        usuario.profile
          ? {
              nombres: usuario.profile.nombres,
              apellidos: usuario.profile.apellidos,
              documentoIdentidad: usuario.profile.documentoIdentidad,
              fotoPerfilUrl: await this.resolvePhotoUrl(usuario.profile),
              nombreFotoPerfil: usuario.profile.nombreFotoPerfil,
              fechaCargaFotoPerfil: usuario.profile.fechaCargaFotoPerfil,
              fechaNacimiento: usuario.profile.fechaNacimiento,
              tipoDocumento: usuario.profile.tipoDocumento
                ? {
                    nombre: usuario.profile.tipoDocumento.nombre,
                    valor: usuario.profile.tipoDocumento.valor,
                  }
                : null,
              validacionEstado:
                usuario.profile.validacionEstado ??
                ProfileValidationStatus.PENDING,
              profilePhones: profilePhones.map((item) => ({
                id: item.id,
                countryCode: item.countryCode,
                phoneNumber: item.phoneNumber,
                internationalPhoneNumber: item.internationalPhoneNumber,
                alias: item.alias,
                verified: item.verified,
                fechaVerificacion: item.fechaVerificacion,
              })),
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
        where: {
          id: dto.idTipoDocumentoIdentidad,
          activo: true,
          eliminado: false,
        },
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

      profile.nombres = dto.nombres?.trim();
      profile.apellidos = dto.apellidos ? dto.apellidos?.trim() : null;
      profile.documentoIdentidad = dto.documentoIdentidad;
      profile.fechaNacimiento = dto.fechaNacimiento
        ? new Date(dto.fechaNacimiento)
        : null;
      profile.tipoDocumento = tipoDocumento;
      const documento = (dto.documentoIdentidad ?? '').trim();
      if (tipoDocumento.id === 3 && /^\d{8}$/.test(documento)) {
        const reniecIdentity =
          await this.authService.resolveReniecIdentity(documento);
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
          profile.validacionEstado = this.authService.resolveValidationStatus(
            tipoDocumento.id,
            profile.nombres,
            profile.apellidos,
            reniecIdentity,
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
      const fotoPerfilUrl = await this.resolvePhotoUrl(profile);

      return new StatusResponse(true, 200, 'Datos personales actualizados', {
        nombres: profile.nombres,
        apellidos: profile.apellidos,
        documentoIdentidad: profile.documentoIdentidad,
        fotoPerfilUrl,
        nombreFotoPerfil: profile.nombreFotoPerfil,
        fechaCargaFotoPerfil: profile.fechaCargaFotoPerfil,
        fechaNacimiento: profile.fechaNacimiento,
        tipoDocumento: {
          nombre: tipoDocumento.nombre,
          valor: tipoDocumento.valor,
        },
        validacionEstado: profile.validacionEstado,
      });
    } catch (error) {
      const statusCode =
        error instanceof BadRequestException ||
        error instanceof NotFoundException
          ? error.getStatus()
          : 500;
      const message =
        error instanceof BadRequestException ||
        error instanceof NotFoundException
          ? error.message
          : 'Error al actualizar datos personales';

      return new StatusResponse(false, statusCode, message, null);
    }
  }

  async updateProfilePhoto(
    usuarioRequest: Usuario,
    file: UploadedFile | undefined,
    ip: string,
  ): Promise<
    StatusResponse<Pick<
      ProfileMeResponseDto,
      'fotoPerfilUrl' | 'nombreFotoPerfil' | 'fechaCargaFotoPerfil'
    > | null>
  > {
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

      const profile = await this.profileRepository.findOne({
        where: { id: usuario.profile.id, activo: true, eliminado: false },
      });
      if (!profile) {
        throw new NotFoundException('Perfil no encontrado');
      }

      if (!file) {
        throw new BadRequestException(
          'Debe enviar una imagen en el campo "file"',
        );
      }

      if (!this.allowedProfilePhotoMimeTypes.has(file.mimetype.toLowerCase())) {
        throw new BadRequestException(
          'Formato de imagen no permitido. Use JPG, PNG o WEBP',
        );
      }

      if (file.size > this.maxProfilePhotoSizeBytes) {
        const maxSizeMb = this.maxProfilePhotoSizeBytes / (1024 * 1024);
        throw new BadRequestException(
          `La imagen supera el tamaño máximo permitido (${maxSizeMb}MB)`,
        );
      }

      const uploadResult = await this.blobStorageService.uploadProfileImage(
        file.buffer,
        file.mimetype,
        file.originalname,
        usuario.id,
        profile.documentoIdentidad,
      );

      profile.fotoPerfilUrl = uploadResult.url;
      profile.nombreFotoPerfil = uploadResult.blobName;
      profile.fechaCargaFotoPerfil = new Date();
      profile.usuarioModificacion = usuarioRequest.login;
      profile.ipModificacion = ip;
      profile.fechaModificacion = new Date();

      await this.profileRepository.save(profile);
      const fotoPerfilUrl = await this.resolvePhotoUrl(profile);

      return new StatusResponse(true, 200, 'Foto de perfil actualizada', {
        fotoPerfilUrl,
        nombreFotoPerfil: profile.nombreFotoPerfil,
        fechaCargaFotoPerfil: profile.fechaCargaFotoPerfil,
      });
    } catch (error) {
      const statusCode =
        error instanceof BadRequestException ||
        error instanceof NotFoundException
          ? error.getStatus()
          : 500;
      const message =
        error instanceof BadRequestException ||
        error instanceof NotFoundException
          ? error.message
          : 'Error al actualizar foto de perfil';

      return new StatusResponse(false, statusCode, message, null);
    }
  }

  private async resolvePhotoUrl(profile: Profile): Promise<string | null> {
    const blobName = profile.nombreFotoPerfil?.trim();
    if (!blobName) {
      return profile.fotoPerfilUrl;
    }

    try {
      return await this.blobStorageService.getProfileImageReadUrl(blobName);
    } catch {
      return profile.fotoPerfilUrl;
    }
  }
}
