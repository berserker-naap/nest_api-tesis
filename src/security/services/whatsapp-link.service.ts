import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StatusResponse } from 'src/common/dto/response.dto';
import {
  ConfirmWhatsappLinkDto,
  RequestWhatsappLinkDto,
  UnlinkWhatsappDto,
} from '../dto/whatsapp-link.dto';
import { Usuario } from '../entities/usuario.entity';
import { OtpVerificacionService } from './otp-verificacion.service';
import { ProfileService } from './profile.service';
import { WhatsappSenderService } from 'src/common/services/whatsapp-sender.service';

@Injectable()
export class WhatsappLinkService {
  constructor(
    private readonly otpService: OtpVerificacionService,
    private readonly profileService: ProfileService,
    private readonly whatsappSenderService: WhatsappSenderService,
  ) {}

  async requestLink(
    dto: RequestWhatsappLinkDto,
    usuarioRequest: Usuario,
    ip: string,
  ): Promise<StatusResponse<any>> {
    try {
      const { usuario, internationalPhoneNumber } =
        await this.profileService.createOrRefreshProfilePhone(
          usuarioRequest,
          dto.countryCode,
          dto.phone,
          ip,
        );

      const { plainCode } = await this.otpService.createOtp({
        usuario,
        canal: 'WHATSAPP',
        destino: internationalPhoneNumber,
      });

      await this.whatsappSenderService.sendOtp(internationalPhoneNumber, plainCode);

      return new StatusResponse(true, 200, 'Codigo enviado por WhatsApp', null);
    } catch (error) {
      const statusCode =
        error instanceof BadRequestException || error instanceof NotFoundException
          ? error.getStatus()
          : 500;
      const message =
        error instanceof BadRequestException || error instanceof NotFoundException
          ? error.message
          : 'Error al solicitar enlace WhatsApp';

      return new StatusResponse(false, statusCode, message, null);
    }
  }

  async confirmLink(
    dto: ConfirmWhatsappLinkDto,
    usuarioRequest: Usuario,
    ip: string,
  ): Promise<StatusResponse<any>> {
    try {
      const { usuario, profilePhone, internationalPhoneNumber } =
        await this.profileService.getProfilePhoneForUsuario(
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

      await this.profileService.markProfilePhoneVerified(profilePhone, usuario.login, ip);

      return new StatusResponse(
        true,
        200,
        'WhatsApp enlazado correctamente',
        null,
      );
    } catch (error) {
      const statusCode =
        error instanceof BadRequestException || error instanceof NotFoundException
          ? error.getStatus()
          : 500;
      const message =
        error instanceof BadRequestException || error instanceof NotFoundException
          ? error.message
          : 'Error al confirmar enlace WhatsApp';

      return new StatusResponse(false, statusCode, message, null);
    }
  }

  async unlink(
    dto: UnlinkWhatsappDto,
    usuarioRequest: Usuario,
    ip: string,
  ): Promise<StatusResponse<any>> {
    try {
      const { usuario, profilePhone } = await this.profileService.getProfilePhoneForUsuario(
        usuarioRequest,
        dto.countryCode,
        dto.phone,
      );
      await this.profileService.unlinkProfilePhone(profilePhone, usuario.login, ip);

      return new StatusResponse(true, 200, 'WhatsApp desvinculado', null);
    } catch (error) {
      const statusCode =
        error instanceof BadRequestException || error instanceof NotFoundException
          ? error.getStatus()
          : 500;
      const message =
        error instanceof BadRequestException || error instanceof NotFoundException
          ? error.message
          : 'Error al desvincular WhatsApp';

      return new StatusResponse(false, statusCode, message, null);
    }
  }

  async findVerifiedUserByWhatsapp(phone: string): Promise<Usuario | null> {
    return this.profileService.findVerifiedUserByWhatsapp(phone);
  }
}
