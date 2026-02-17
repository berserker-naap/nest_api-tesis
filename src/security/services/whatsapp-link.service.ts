import { Injectable } from '@nestjs/common';
import { Usuario } from '../entities/usuario.entity';
import { ProfilePhoneService } from './profile-phone.service';

@Injectable()
export class WhatsappLinkService {
  constructor(private readonly profilePhoneService: ProfilePhoneService) {}

  async findVerifiedUserByWhatsapp(phone: string): Promise<Usuario | null> {
    return this.profilePhoneService.findVerifiedUserByWhatsapp(phone);
  }
}
