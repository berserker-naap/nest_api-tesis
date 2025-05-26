import { Controller, Get, Post, Body, Req, Param, ParseIntPipe } from '@nestjs/common';
import { CreatePermisoDto, PermisoBulkDto } from '../dto/permiso.dto';
import { PermisoService } from '../services/permiso.service';

@Controller('permiso')
export class PermisoController {
  constructor(private readonly permisoService: PermisoService) {}

  @Get()
  findAll() {
    return this.permisoService.findAll();
  }

  @Post()
  create(@Body() dto: CreatePermisoDto, @Req() req: any) {
    const usuario = req.user?.username || 'sistema';
    const ip = req.ip;
    return this.permisoService.create(dto, usuario, ip);
  }

  @Get('rol/:idRol')
getPermisosPorRol(@Param('idRol', ParseIntPipe) idRol: number) {
  return this.permisoService.getPermisosPorRol(idRol);
}

@Post('rol')
actualizarPermisosRol(@Body() dto: PermisoBulkDto[], @Req() req: any) {
  const usuario = req.user?.username || 'sistema';
  const ip = req.ip;
  return this.permisoService.actualizarPermisos(dto, usuario, ip);
}

}
