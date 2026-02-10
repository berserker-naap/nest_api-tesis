import { Controller, Post, Body, Get, ParseIntPipe, Param, Patch, Delete } from '@nestjs/common';
import { CreateUsuarioDto, UpdateUsuarioDto } from '../dto/usuario.dto';
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

  @Get(':id')
  @Auth()
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usuarioService.findOne(id);
  }

  @Post()
  @Auth()
  async create(@Body() dto: CreateUsuarioDto, @GetUsuario() user: Usuario, @GetClientIp() ip: string) {
    return this.usuarioService.create(dto, user.login, ip);
  }

  @Patch(':id')
  @Auth()
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUsuarioDto, @GetUsuario() user: Usuario, @GetClientIp() ip: string) {
    return this.usuarioService.update(id, dto, user.login, ip);
  }

  @Delete(':id')
  @Auth()
  delete(
    @Param('id', ParseIntPipe) id: number,
    @GetUsuario() user: Usuario,
    @GetClientIp() ip: string,
  ) {
    return this.usuarioService.delete(id, user.login, ip);
  }

  @Post('delete-all')
  @Auth()
  deleteMany(
    @Body() ids: number[],
    @GetUsuario() user: Usuario,
    @GetClientIp() ip: string,
  ) {
    return this.usuarioService.deleteMany(ids, user.login, ip);
  }

  // @Post(':id/roles')
  // @Auth()
  // async asignarRoles(
  //   @Param('id', ParseIntPipe) id: number,
  //   @Body() dto: AsignarUsuarioRolesDto,
  //   @GetUsuario() user: Usuario,  @GetClientIp() ip: string
  // ) {
  //   return this.usuarioService.asignarRoles(id, dto,user.login, ip);
  // }
}
