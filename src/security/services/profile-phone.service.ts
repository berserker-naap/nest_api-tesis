import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StatusResponse } from 'src/common/dto/response.dto';
import { Repository } from 'typeorm';
import { Usuario } from '../entities/usuario.entity';
import { CreateProfilePhoneDto, VerifyProfilePhoneOtpDto } from '../dto/profile-phone.dto';
import { OtpVerificacionService } from './otp-verificacion.service';
import { WhatsappSenderService } from 'src/common/services/whatsapp-sender.service';
import { ProfilePhone } from '../entities/profile-phone.entity';

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

  private buildPhoneParts(countryCode: string, phone: string): {
    countryCode: string;
    phoneNumber: string;
    internationalPhoneNumber: string;
  } {
    const normalizedCountry = countryCode.replace(/[^\d]/g, '');
    if (!/^\d{1,4}$/.test(normalizedCountry)) {
      throw new BadRequestException('Codigo de pais invalido');
    }

    const normalizedPhone = phone.replace(/[^\d]/g, '');
    if (!/^\d{6,15}$/.test(normalizedPhone)) {
      throw new BadRequestException('Telefono invalido');
    }

    return {
      countryCode: `+${normalizedCountry}`,
      phoneNumber: normalizedPhone,
      internationalPhoneNumber: `+${normalizedCountry}${normalizedPhone}`,
    };
  }

  private normalizeIncomingWhatsappPhone(phone: string): string {
    const cleaned = phone.trim().replace(/[^\d+]/g, '');
    const internationalPhoneNumber = cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
    if (!/^\+\d{8,19}$/.test(internationalPhoneNumber)) {
      throw new BadRequestException('Telefono WhatsApp invalido');
    }
    return internationalPhoneNumber;
  }

  private async getUsuarioConProfile(usuarioId: number): Promise<Usuario> {
    const usuario = await this.usuarioRepository.findOne({
      where: { id: usuarioId, activo: true, eliminado: false },
      relations: ['profile'],
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (!usuario.profile) {
      throw new NotFoundException('La cuenta no tiene un perfil asociado');
    }

    return usuario;
  }

  private async createOrRefreshProfilePhone(
    usuarioRequest: Usuario,
    countryCode: string,
    phone: string,
    ip: string,
    alias?: string | null,
  ): Promise<{
    usuario: Usuario;
    profilePhone: ProfilePhone;
    internationalPhoneNumber: string;
  }> {
    const usuario = await this.getUsuarioConProfile(usuarioRequest.id);
    const phoneParts = this.buildPhoneParts(countryCode, phone);

    const linkedInOtherProfile = await this.profilePhoneRepository.findOne({
      where: {
        internationalPhoneNumber: phoneParts.internationalPhoneNumber,
        activo: true,
        eliminado: false,
      },
      relations: ['profile'],
    });

    if (linkedInOtherProfile && linkedInOtherProfile.profile.id !== usuario.profile!.id) {
      throw new BadRequestException('Ese numero ya esta vinculado a otro perfil');
    }

    let profilePhone = await this.profilePhoneRepository.findOne({
      where: {
        profile: { id: usuario.profile!.id },
        internationalPhoneNumber: phoneParts.internationalPhoneNumber,
        activo: true,
        eliminado: false,
      },
      relations: ['profile'],
    });

    if (!profilePhone) {
      profilePhone = this.profilePhoneRepository.create({
        profile: usuario.profile!,
        countryCode: phoneParts.countryCode,
        phoneNumber: phoneParts.phoneNumber,
        internationalPhoneNumber: phoneParts.internationalPhoneNumber,
        alias: alias?.trim() || null,
        verified: false,
        fechaVerificacion: null,
        usuarioRegistro: usuario.login,
        ipRegistro: ip,
      });
    } else {
      profilePhone.countryCode = phoneParts.countryCode;
      profilePhone.phoneNumber = phoneParts.phoneNumber;
      profilePhone.alias = alias?.trim() || profilePhone.alias || null;
      profilePhone.verified = false;
      profilePhone.fechaVerificacion = null;
      profilePhone.usuarioModificacion = usuario.login;
      profilePhone.ipModificacion = ip;
      profilePhone.fechaModificacion = new Date();
    }

    await this.profilePhoneRepository.save(profilePhone);
    return {
      usuario,
      profilePhone,
      internationalPhoneNumber: phoneParts.internationalPhoneNumber,
    };
  }

  private async getProfilePhoneForUsuario(
    usuarioRequest: Usuario,
    countryCode: string,
    phone: string,
  ): Promise<{
    usuario: Usuario;
    profilePhone: ProfilePhone;
    internationalPhoneNumber: string;
  }> {
    const usuario = await this.getUsuarioConProfile(usuarioRequest.id);
    const phoneParts = this.buildPhoneParts(countryCode, phone);

    const profilePhone = await this.profilePhoneRepository.findOne({
      where: {
        profile: { id: usuario.profile!.id },
        internationalPhoneNumber: phoneParts.internationalPhoneNumber,
        activo: true,
        eliminado: false,
      },
      relations: ['profile'],
    });

    if (!profilePhone) {
      throw new NotFoundException('No existe solicitud de enlace para ese numero');
    }

    return {
      usuario,
      profilePhone,
      internationalPhoneNumber: phoneParts.internationalPhoneNumber,
    };
  }

  async findMyPhones(usuarioRequest: Usuario): Promise<StatusResponse<any>> {
    try {
      const usuario = await this.getUsuarioConProfile(usuarioRequest.id);
      const phones = await this.profilePhoneRepository.find({
        where: {
          profile: { id: usuario.profile!.id },
          activo: true,
          eliminado: false,
        },
        order: { fechaRegistro: 'DESC' },
      });
      const payload = phones.map((item) => ({
        id: item.id,
        countryCode: item.countryCode,
        phoneNumber: item.phoneNumber,
        internationalPhoneNumber: item.internationalPhoneNumber,
        alias: item.alias,
        verified: item.verified,
        fechaVerificacion: item.fechaVerificacion,
      }));
      return new StatusResponse(true, 200, 'Telefonos obtenidos', payload);
    } catch (error) {
      const statusCode = error instanceof NotFoundException ? error.getStatus() : 500;
      const message =
        error instanceof NotFoundException ? error.message : 'Error al obtener telefonos';
      return new StatusResponse(false, statusCode, message, null);
    }
  }

  async createAndSendOtp(
    dto: CreateProfilePhoneDto,
    usuarioRequest: Usuario,
    ip: string,
  ): Promise<StatusResponse<any>> {
    try {
      const { usuario, internationalPhoneNumber } =
        await this.createOrRefreshProfilePhone(
          usuarioRequest,
          dto.countryCode,
          dto.phone,
          ip,
          dto.alias ?? null,
        );

      const { plainCode } = await this.otpService.createOtp({
        usuario,
        canal: 'WHATSAPP',
        destino: internationalPhoneNumber,
      });

      await this.whatsappSenderService.sendOtp(internationalPhoneNumber, plainCode);

      return new StatusResponse(true, 200, 'Codigo OTP enviado por WhatsApp', null);
    } catch (error) {
      const statusCode =
        error instanceof BadRequestException || error instanceof NotFoundException
          ? error.getStatus()
          : 500;
      const message =
        error instanceof BadRequestException || error instanceof NotFoundException
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
      const { usuario, profilePhone, internationalPhoneNumber } =
        await this.getProfilePhoneForUsuario(
          usuarioRequest,
          dto.countryCode,
          dto.phone,
        );

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

      return new StatusResponse(true, 200, 'Telefono validado correctamente', null);
    } catch (error) {
      const statusCode =
        error instanceof BadRequestException || error instanceof NotFoundException
          ? error.getStatus()
          : 500;
      const message =
        error instanceof BadRequestException || error instanceof NotFoundException
          ? error.message
          : 'Error al validar telefono';

      return new StatusResponse(false, statusCode, message, null);
    }
  }

  async findVerifiedUserByWhatsapp(phone: string): Promise<Usuario | null> {
    const normalized = this.normalizeIncomingWhatsappPhone(phone);
    const profilePhone = await this.profilePhoneRepository.findOne({
      where: {
        internationalPhoneNumber: normalized,
        verified: true,
        activo: true,
        eliminado: false,
      },
      relations: ['profile'],
    });

    if (!profilePhone) {
      return null;
    }

    return this.usuarioRepository.findOne({
      where: {
        profile: { id: profilePhone.profile.id },
        activo: true,
        eliminado: false,
      },
      relations: ['profile'],
    });
  }
}
