import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { Auth, GetUsuario } from 'src/auth/decorators';
import { Usuario } from '../entities/usuario.entity';
import { ModuloService } from '../services/modulo.service';
import { CreateUpdateModuloDto } from '../dto/modulo.dto';

@Controller('modulo')
export class ModuloController {
  constructor(private readonly opcionService: ModuloService) {}

  @Get()
  @Auth()
  findAll() {
    return this.opcionService.findAll();
  }

  @Get(':id')
  @Auth()
  findOne(@Param('id') id: number) {
    return this.opcionService.findOne(id);
  }

  @Post()
  @Auth()
  create(@Body() dto: CreateUpdateModuloDto) {
    return this.opcionService.create(dto);
  }

  @Patch(':id')
  @Auth()
  update(@Param('id') id: number, @Body() dto: CreateUpdateModuloDto) {
    return this.opcionService.update(id, dto);
  }

  @Delete(':id')
  @Auth()
  delete(@Param('id') id: number) {
    return this.opcionService.delete(id);
  }

  @Post('delete-all')
  @Auth()
  deleteMany(@Body() ids: number[]) {
    return this.opcionService.deleteMany(ids);
  }
}