import { Controller, Post, Body, Get } from '@nestjs/common';
import { CreateUpdatePermisoDto } from '../dto/permiso.dto';
import { PermisoService } from '../services/permiso.service';


@Controller('secutity/permiso')
export class PermisoController {
  constructor(private readonly permisoService: PermisoService) {}

  @Post('create')
  create(@Body() createPermisoDto: CreateUpdatePermisoDto) {
    return this.permisoService.create(createPermisoDto);
  }

  @Get()
  findAll() {
    return this.permisoService.findAll();
  }
}
