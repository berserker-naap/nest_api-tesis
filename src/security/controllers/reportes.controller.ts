import { Controller, Get, Query } from '@nestjs/common';
import { Auth, GetUsuario } from 'src/auth/decorators';
import { Usuario } from '../entities/usuario.entity';
import { ReportesService } from '../services/reportes.service';

@Controller('reportes')
@Auth()
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get('errores-servicio')
  getServiceErrors(
    @GetUsuario() usuario: Usuario,
    @Query('limit') limit?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reportesService.getServiceErrors(usuario, limit, from, to);
  }

  @Get('whatsapp')
  getWhatsappLogs(
    @GetUsuario() usuario: Usuario,
    @Query('limit') limit?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reportesService.getWhatsappLogs(usuario, limit, from, to);
  }

  @Get('correos')
  getEmailLogs(
    @GetUsuario() usuario: Usuario,
    @Query('limit') limit?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reportesService.getEmailLogs(usuario, limit, from, to);
  }

  @Get('push')
  getPushLogs(
    @GetUsuario() usuario: Usuario,
    @Query('limit') limit?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reportesService.getPushLogs(usuario, limit, from, to);
  }
}
