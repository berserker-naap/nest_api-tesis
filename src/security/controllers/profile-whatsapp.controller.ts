import { Body, Controller, Delete, Post } from '@nestjs/common';
import { Auth, GetClientIp, GetUsuario } from 'src/auth/decorators';
import { Usuario } from '../entities/usuario.entity';
import {
  ConfirmWhatsappLinkDto,
  RequestWhatsappLinkDto,
} from '../dto/whatsapp-link.dto';
import { WhatsappLinkService } from '../services/whatsapp-link.service';

@Controller('profile/whatsapp')
@Auth()
export class ProfileWhatsappController {
  constructor(private readonly whatsappLinkService: WhatsappLinkService) {}

  @Post('request-link')
  requestLink(
    @Body() dto: RequestWhatsappLinkDto,
    @GetUsuario() usuario: Usuario,
    @GetClientIp() ip: string,
  ) {
    return this.whatsappLinkService.requestLink(dto, usuario, ip);
  }

  @Post('confirm-link')
  confirmLink(
    @Body() dto: ConfirmWhatsappLinkDto,
    @GetUsuario() usuario: Usuario,
    @GetClientIp() ip: string,
  ) {
    return this.whatsappLinkService.confirmLink(dto, usuario, ip);
  }

  @Delete('unlink')
  unlink(@GetUsuario() usuario: Usuario, @GetClientIp() ip: string) {
    return this.whatsappLinkService.unlink(usuario, ip);
  }
}
