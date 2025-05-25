import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { Auth, GetUsuario } from 'src/auth/decorators';
import { Usuario } from '../entities/usuario.entity';
import { RolService } from '../services/rol.service';
import { CreateUpdateRolDto } from '../dto/rol.dto';

@Controller('rol')
export class RolController {
  constructor(private readonly opcionService: RolService) {}

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
  create(@Body() dto: CreateUpdateRolDto) {
    return this.opcionService.create(dto);
  }

  @Patch(':id')
  @Auth()
  update(@Param('id') id: number, @Body() dto: CreateUpdateRolDto) {
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