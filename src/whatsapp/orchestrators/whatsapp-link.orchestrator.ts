import { Injectable } from '@nestjs/common';
import { Usuario } from 'src/security/entities/usuario.entity';
import { ProfilePhoneLookupStatus } from 'src/security/enums/profile-phone-lookup-status.enum';
import { ProfilePhoneService } from 'src/security/services/profile-phone.service';

@Injectable()
export class WhatsappLinkOrchestrator {
  constructor(
    private readonly profilePhoneService: ProfilePhoneService,
  ) {}

  async resolveByInternationalPhone(internationalPhoneNumber: string): Promise<{
    status: ProfilePhoneLookupStatus;
    usuario: Pick<Usuario, 'id' | 'login'> | null;
  }> {
    return this.profilePhoneService.findVerifiedUsuarioByInternationalPhone(
      internationalPhoneNumber,
    );
  }
}
