import { Body, Controller, Post } from '@nestjs/common';
import { Auth, GetClientIp, GetUsuario } from 'src/auth/decorators';
import { Usuario } from 'src/security/entities/usuario.entity';
import { SendEmailDto, SendTemplateEmailDto } from '../dto/send-email.dto';
import { MessagingMailService } from '../services/messaging-mail.service';

@Controller('email')
@Auth()
export class MessagingEmailController {
  constructor(private readonly messagingMailService: MessagingMailService) {}

  @Post('send')
  send(
    @Body() dto: SendEmailDto,
    @GetUsuario() usuario: Usuario,
    @GetClientIp() ip: string,
  ) {
    return this.messagingMailService.send(dto, usuario, ip);
  }

  @Post('send-template')
  sendTemplate(
    @Body() dto: SendTemplateEmailDto,
    @GetUsuario() usuario: Usuario,
    @GetClientIp() ip: string,
  ) {
    return this.messagingMailService.sendTemplate(dto, usuario, ip);
  }
}

