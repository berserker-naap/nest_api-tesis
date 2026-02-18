import { Injectable } from '@nestjs/common';
import { Usuario } from 'src/security/entities/usuario.entity';
import { ProfilePhoneLookupStatus } from 'src/security/enums/profile-phone-lookup-status.enum';
import { OtpVerificacionService } from 'src/security/services/otp-verificacion.service';
import { ProfilePhoneService } from 'src/security/services/profile-phone.service';

@Injectable()
export class WhatsappLinkOrchestrator {
  constructor(
    private readonly profilePhoneService: ProfilePhoneService,
    private readonly otpVerificacionService: OtpVerificacionService,
  ) {}

  async resolveByInternationalPhone(internationalPhoneNumber: string): Promise<{
    status: ProfilePhoneLookupStatus;
    usuario: Pick<Usuario, 'id' | 'login'> | null;
  }> {
    return this.profilePhoneService.findVerifiedUsuarioByInternationalPhone(
      internationalPhoneNumber,
    );
  }

  async createWhatsappOtp(
    usuario: Pick<Usuario, 'id' | 'login'>,
    internationalPhoneNumber: string,
  ): Promise<string> {
    const { plainCode } = await this.otpVerificacionService.createOtp({
      usuario: { id: usuario.id } as Usuario,
      canal: 'WHATSAPP',
      destino: internationalPhoneNumber,
    });

    return plainCode;
  }
}
