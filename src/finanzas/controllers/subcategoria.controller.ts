import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { Auth, GetUsuario } from 'src/auth/decorators';
import { CreateUpdateSubcategoriaDto } from '../dto/subcategoria.dto';
import { GetClientIp } from 'src/auth/decorators/get-client-ip.decorator';
import { Usuario } from 'src/security/entities/usuario.entity';
import { SubcategoriaService } from '../services/subcategoria.service';

@Controller('subcategoria')
export class SubcategoriaController {
  constructor(private readonly sSubcategoriaService: SubcategoriaService) {}

  @Get()
  @Auth()
  findAll() {
    return this.sSubcategoriaService.findAll();
  }

  @Get(':id')
  @Auth()
  findOne(@Param('id') id: number) {
    return this.sSubcategoriaService.findOne(id);
  }

  @Post()
  @Auth()
  create(@Body() dto: CreateUpdateSubcategoriaDto, @GetUsuario() user: Usuario,  @GetClientIp() ip: string) {
    return this.sSubcategoriaService.create(dto, user.login, ip);
  }

  @Patch(':id')
  @Auth()
  update(@Param('id') id: number,@Body() dto: CreateUpdateSubcategoriaDto, @GetUsuario() user: Usuario,  @GetClientIp() ip: string) {
    return this.sSubcategoriaService.update(id,dto, user.login, ip);
  }

  @Delete(':id')
  @Auth()
  delete(@Param('id') id: number, @GetUsuario() user: Usuario,  @GetClientIp() ip: string) {
    return this.sSubcategoriaService.delete(id, user.login, ip);
  }

  @Post('delete-all')
  @Auth()
  deleteMany(@Body() ids: number[], @GetUsuario() user: Usuario,  @GetClientIp() ip: string) {
    return this.sSubcategoriaService.deleteMany(ids, user.login, ip);
  }
}