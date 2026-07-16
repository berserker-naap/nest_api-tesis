import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { Auth, GetClientIp, GetUsuario } from 'src/auth/decorators';
import { Usuario } from 'src/security/entities/usuario.entity';
import { GuardarPresupuestoCategoriaDto, ListarPresupuestosQueryDto } from '../dto/presupuesto-categoria.dto';
import { PresupuestoCategoriaService } from '../services/presupuesto-categoria.service';

@Controller('presupuestos')
@Auth()
export class PresupuestoCategoriaController {
  constructor(private readonly presupuestoService: PresupuestoCategoriaService) {}

  @Get()
  findAll(@Query() query: ListarPresupuestosQueryDto, @GetUsuario() usuario: Usuario) {
    return this.presupuestoService.findAll(query, usuario);
  }

  @Post()
  save(
    @Body() dto: GuardarPresupuestoCategoriaDto,
    @GetUsuario() usuario: Usuario,
    @GetClientIp() ip: string,
  ) {
    return this.presupuestoService.save(dto, usuario, ip);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUsuario() usuario: Usuario,
    @GetClientIp() ip: string,
  ) {
    return this.presupuestoService.remove(id, usuario, ip);
  }
}
