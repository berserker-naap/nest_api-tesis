import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { Auth, GetClientIp, GetUsuario } from 'src/auth/decorators';
import { Usuario } from 'src/security/entities/usuario.entity';
import { UpsertPushInstallationDto } from '../dto/push-installation.dto';
import { SendNativePushDto, SendTemplatePushDto } from '../dto/send-push.dto';
import { MessagingPushService } from '../services/messaging-push.service';

@Controller('push')
@Auth()
export class MessagingPushController {
  constructor(private readonly messagingPushService: MessagingPushService) {}

  @Get('installations')
  listMyInstallations(@GetUsuario() usuario: Usuario) {
    return this.messagingPushService.listMyInstallations(usuario);
  }

  @Put('installations/:installationId')
  upsertInstallation(
    @Param('installationId') installationId: string,
    @Body() dto: UpsertPushInstallationDto,
    @GetUsuario() usuario: Usuario,
    @GetClientIp() ip: string,
  ) {
    return this.messagingPushService.upsertInstallation(
      installationId,
      dto,
      usuario,
      ip,
    );
  }

  @Delete('installations/:installationId')
  deleteInstallation(
    @Param('installationId') installationId: string,
    @GetUsuario() usuario: Usuario,
    @GetClientIp() ip: string,
  ) {
    return this.messagingPushService.deleteInstallation(
      installationId,
      usuario,
      ip,
    );
  }

  @Post('send-template')
  sendTemplate(
    @Body() dto: SendTemplatePushDto,
    @GetUsuario() usuario: Usuario,
    @GetClientIp() ip: string,
  ) {
    return this.messagingPushService.sendTemplate(dto, usuario, ip);
  }

  @Post('send-native')
  sendNative(
    @Body() dto: SendNativePushDto,
    @GetUsuario() usuario: Usuario,
    @GetClientIp() ip: string,
  ) {
    return this.messagingPushService.sendNative(dto, usuario, ip);
  }
}
