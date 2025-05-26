import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { Auth, GetUsuario } from 'src/auth/decorators';
import { Usuario } from '../entities/usuario.entity';
import { OpcionService } from '../services/opcion.service';
import { CreateUpdateOpcionDto } from '../dto/opcion.dto';
import { GetClientIp } from 'src/auth/decorators/get-client-ip.decorator';

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
  create(@Body() dto: CreateUpdateOpcionDto, @GetUsuario() user: Usuario,  @GetClientIp() ip: string) {
    return this.opcionService.create(dto, user.login, ip);
  }

  @Patch(':id')
  @Auth()
  update(@Param('id') id: number,@Body() dto: CreateUpdateOpcionDto, @GetUsuario() user: Usuario,  @GetClientIp() ip: string) {
    return this.opcionService.update(id,dto, user.login, ip);
  }

  @Delete(':id')
  @Auth()
  delete(@Param('id') id: number, @GetUsuario() user: Usuario,  @GetClientIp() ip: string) {
    return this.opcionService.delete(id, user.login, ip);
  }

  @Post('delete-all')
  @Auth()
  deleteMany(@Body() ids: number[], @GetUsuario() user: Usuario,  @GetClientIp() ip: string) {
    return this.opcionService.deleteMany(ids, user.login, ip);
  }
}