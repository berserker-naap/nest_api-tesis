import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { OpcionService } from '../services/opcion.service';
import { Auth, GetUsuario } from 'src/auth/decorators';
import { Usuario } from '../entities/usuario.entity';
import { CreateUpdateOpcionDto } from '../dto/opcion.dto';

@Controller('opcion')
export class OpcionController {
  constructor(private readonly opcionService: OpcionService) {}

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
  create(@Body() dto: CreateUpdateOpcionDto) {
    return this.opcionService.create(dto);
  }

  @Patch(':id')
  @Auth()
  update(@Param('id') id: number, @Body() dto: CreateUpdateOpcionDto) {
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