import { Controller, Post, Body, Get, ParseIntPipe, Param } from '@nestjs/common';
import { AsignarUsuarioRolesDto, CreateUsuarioDto } from '../dto/usuario.dto';
import { UsuarioService } from '../services/usuario.service';
import { Auth, GetClientIp, GetUsuario } from 'src/auth/decorators';
import { Usuario } from '../entities/usuario.entity';


@Controller('usuario')
export class UsuarioController {
  constructor(private readonly usuarioService: UsuarioService) { }


  @Get()
  async findAll() {
    return this.usuarioService.findAll();
  }

  @Post()
  @Auth()
  async create(@Body() dto: CreateUsuarioDto, @GetUsuario() user: Usuario,  @GetClientIp() ip: string) {
    return this.usuarioService.create(dto,user.login, ip);
  }

  @Post(':id/roles')
  @Auth()
  async asignarRoles(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AsignarUsuarioRolesDto,
    @GetUsuario() user: Usuario,  @GetClientIp() ip: string
  ) {
    return this.usuarioService.asignarRoles(id, dto,user.login, ip);
  }
}
