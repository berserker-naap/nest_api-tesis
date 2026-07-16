import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { Auth, GetClientIp, GetUsuario } from 'src/auth/decorators';
import { Usuario } from 'src/security/entities/usuario.entity';
import {
  AbonarMetaAhorroDto,
  CrearMetaAhorroDto,
  CrearPagoRecurrenteDto,
  PeriodoMonedaQueryDto,
} from '../dto/planificacion-financiera.dto';
import { PlanificacionFinancieraService } from '../services/planificacion-financiera.service';

@Controller('planificacion')
@Auth()
export class PlanificacionFinancieraController {
  constructor(private readonly service: PlanificacionFinancieraService) {}

  @Get('metas')
  listGoals(@GetUsuario() usuario: Usuario) {
    return this.service.listGoals(usuario);
  }

  @Post('metas')
  createGoal(@Body() dto: CrearMetaAhorroDto, @GetUsuario() usuario: Usuario, @GetClientIp() ip: string) {
    return this.service.createGoal(dto, usuario, ip);
  }

  @Patch('metas/:id/abonos')
  contributeGoal(@Param('id', ParseIntPipe) id: number, @Body() dto: AbonarMetaAhorroDto, @GetUsuario() usuario: Usuario, @GetClientIp() ip: string) {
    return this.service.contributeGoal(id, dto, usuario, ip);
  }

  @Delete('metas/:id')
  removeGoal(@Param('id', ParseIntPipe) id: number, @GetUsuario() usuario: Usuario, @GetClientIp() ip: string) {
    return this.service.removeGoal(id, usuario, ip);
  }

  @Get('recurrentes')
  listRecurring(@GetUsuario() usuario: Usuario) {
    return this.service.listRecurring(usuario);
  }

  @Post('recurrentes')
  createRecurring(@Body() dto: CrearPagoRecurrenteDto, @GetUsuario() usuario: Usuario, @GetClientIp() ip: string) {
    return this.service.createRecurring(dto, usuario, ip);
  }

  @Post('recurrentes/:id/registrar')
  registerRecurring(@Param('id', ParseIntPipe) id: number, @GetUsuario() usuario: Usuario, @GetClientIp() ip: string) {
    return this.service.registerRecurring(id, usuario, ip);
  }

  @Delete('recurrentes/:id')
  removeRecurring(@Param('id', ParseIntPipe) id: number, @GetUsuario() usuario: Usuario, @GetClientIp() ip: string) {
    return this.service.removeRecurring(id, usuario, ip);
  }

  @Get('reporte-mensual')
  monthlyReport(@Query() query: PeriodoMonedaQueryDto, @GetUsuario() usuario: Usuario) {
    return this.service.monthlyReport(query, usuario);
  }
}
