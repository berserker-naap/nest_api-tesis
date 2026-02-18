import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StatusResponse } from 'src/common/dto/response.dto';
import { Repository } from 'typeorm';
import { Usuario } from '../entities/usuario.entity';
import {
  CreateProfilePhoneDto,
  VerifyProfilePhoneOtpDto,
} from '../dto/profile-phone.dto';
import { OtpVerificacionService } from './otp-verificacion.service';
import { WhatsappSenderService } from 'src/common/services/whatsapp-sender.service';
import { ProfilePhone } from '../entities/profile-phone.entity';
import { ProfileMeResponseDto } from '../dto/profile.dto';
import { ProfilePhoneStatus } from '../enums/profile-phone-status.enum';

@Injectable()
export class ProfilePhoneService {
  constructor(
    @InjectRepository(ProfilePhone)
    private readonly profilePhoneRepository: Repository<ProfilePhone>,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    private readonly otpService: OtpVerificacionService,
    private readonly whatsappSenderService: WhatsappSenderService,
  ) {}

  async createAndSendOtp(
    dto: CreateProfilePhoneDto,
    usuarioRequest: Usuario,
    ip: string,
  ): Promise<
    StatusResponse<
      | (Pick<ProfileMeResponseDto, 'profilePhones'> & {
          otp: { sent: boolean; channel: 'WHATSAPP' };
        })
      | null
    >
  > {
    try {
      const countryCode = dto.countryCode.trim();
      const phoneNumber = dto.phone.trim();
      const internationalPhoneNumber = dto.internationalPhoneNumber.trim();

      //VALIDAR USUARIO Y PERFIL
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

      //VALIDAR QUE EL NUMERO NO ESTE VINCULADO A OTRO PERFIL
      const linkedInOtherProfile = await this.profilePhoneRepository.findOne({
        where: {
          internationalPhoneNumber: internationalPhoneNumber,
          activo: true,
          eliminado: false,
        },
        relations: ['profile'],
      });

      if (
        linkedInOtherProfile &&
        linkedInOtherProfile.profile.id !== usuario.profile!.id
      ) {
        throw new BadRequestException(
          'Ese numero ya esta vinculado a otro perfil',
        );
      }

      let profilePhone = await this.profilePhoneRepository.findOne({
        where: {
          profile: { id: usuario.profile!.id },
          internationalPhoneNumber: internationalPhoneNumber,
        },
        relations: ['profile'],
      });

      if (!profilePhone) {
        profilePhone = this.profilePhoneRepository.create({
          profile: usuario.profile!,
          countryCode: countryCode,
          phoneNumber: phoneNumber,
          internationalPhoneNumber: internationalPhoneNumber,
          alias: dto.alias.trim() || null,
          verified: false,
          fechaVerificacion: null,
          activo: true,
          eliminado: false,
          usuarioRegistro: usuario.login,
          ipRegistro: ip,
          fechaRegistro: new Date(),
        });
      } else {
        profilePhone.countryCode = countryCode;
        profilePhone.phoneNumber = phoneNumber;
        profilePhone.internationalPhoneNumber = internationalPhoneNumber;
        profilePhone.alias = dto.alias.trim() || profilePhone.alias || null;
        profilePhone.verified = false;
        profilePhone.fechaVerificacion = null;
        profilePhone.activo = true;
        profilePhone.eliminado = false;
        profilePhone.usuarioModificacion = usuario.login;
        profilePhone.ipModificacion = ip;
        profilePhone.fechaModificacion = new Date();
      }

      await this.profilePhoneRepository.save(profilePhone);

      const { plainCode } = await this.otpService.createOtp({
        usuario,
        canal: 'WHATSAPP',
        destino: internationalPhoneNumber,
      });

      const usuarioProfilePhones = await this.usuarioRepository.findOne({
        where: { id: usuarioRequest.id, activo: true, eliminado: false },
        relations: [
          'profile',
          'profile.tipoDocumento',
          'profile.profilePhones',
        ],
      });

      if (!usuarioProfilePhones) {
        throw new NotFoundException('Usuario no encontrado');
      }

      const profilePhones = (usuarioProfilePhones.profile?.profilePhones ?? [])
        .filter((item) => item.activo && !item.eliminado)
        .sort((a, b) => b.fechaRegistro.getTime() - a.fechaRegistro.getTime());

      const phones = profilePhones.map((item) => ({
        id: item.id,
        countryCode: item.countryCode,
        phoneNumber: item.phoneNumber,
        internationalPhoneNumber: item.internationalPhoneNumber,
        alias: item.alias,
        verified: item.verified,
        estado: item.verified
          ? ProfilePhoneStatus.VERIFIED
          : ProfilePhoneStatus.PENDING,
        fechaVerificacion: item.fechaVerificacion,
      }));

      return new StatusResponse(true, 200, 'Codigo OTP enviado por WhatsApp', {
        profilePhones: phones,
        otp: {
          sent: true,
          channel: 'WHATSAPP',
        },
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
          : 'Error al registrar telefono';

      return new StatusResponse(false, statusCode, message, null);
    }
  }

  async verifyOtp(
    dto: VerifyProfilePhoneOtpDto,
    usuarioRequest: Usuario,
    ip: string,
  ): Promise<StatusResponse<any>> {
    try {
      const internationalPhoneNumber = dto.internationalPhoneNumber.trim();
      const usuario = await this.usuarioRepository.findOne({
        where: { id: usuarioRequest.id, activo: true, eliminado: false },
        relations: ['profile', 'profile.profilePhones'],
      });

      if (!usuario) {
        throw new NotFoundException('Usuario no encontrado');
      }

      if (!usuario.profile) {
        throw new NotFoundException('La cuenta no tiene un perfil asociado');
      }

      const profilePhone = usuario.profile.profilePhones.find(
        (item) =>
          item.internationalPhoneNumber === internationalPhoneNumber &&
          item.activo &&
          !item.eliminado,
      );

      if (!profilePhone) {
        throw new NotFoundException(
          'No existe solicitud de enlace para ese numero',
        );
      }

      await this.otpService.validateOtp({
        usuarioId: usuario.id,
        canal: 'WHATSAPP',
        destino: internationalPhoneNumber,
        code: dto.code,
      });

      profilePhone.verified = true;
      profilePhone.fechaVerificacion = new Date();
      profilePhone.usuarioModificacion = usuario.login;
      profilePhone.ipModificacion = ip;
      profilePhone.fechaModificacion = new Date();
      await this.profilePhoneRepository.save(profilePhone);

      return new StatusResponse(
        true,
        200,
        'Telefono validado correctamente',
        null,
      );
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
          : 'Error al validar telefono';

      return new StatusResponse(false, statusCode, message, null);
    }
  }
}
