import { Controller, Get, Post, Body, Req, Param, ParseIntPipe } from '@nestjs/common';
import { CreatePermisoDto, PermisoBulkDto } from '../dto/permiso.dto';
import { PermisoService } from '../services/permiso.service';
import { Auth, GetClientIp, GetUsuario } from 'src/auth/decorators';
import { Usuario } from '../entities/usuario.entity';

@Controller('permiso')
export class PermisoController {
  constructor(private readonly permisoService: PermisoService) { }

  @Get()
  @Auth()
  findAll() {
    return this.permisoService.findAll();
  }

  @Post()
  @Auth()
  create(@Body() dto: CreatePermisoDto,  @GetUsuario() user: Usuario,  @GetClientIp() ip: string) {
    return this.permisoService.create(dto, user.login, ip);
  }

  @Get('rol/:idRol')
  @Auth()
  getPermisosPorRol(@Param('idRol', ParseIntPipe) idRol: number) {
    return this.permisoService.getPermisosPorRol(idRol);
  }

  @Post('rol')
  @Auth()
  actualizarPermisosRol(@Body() dto: PermisoBulkDto[],  @GetUsuario() user: Usuario,  @GetClientIp() ip: string) {
    return this.permisoService.actualizarPermisos(dto, user.login, ip);
  }

}
