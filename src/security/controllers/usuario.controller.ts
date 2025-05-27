import { Controller, Post, Body, Get } from '@nestjs/common';
import { CreateUpdateUsuarioDto, CreateUsuarioWithPersonaDto } from '../dto/usuario.dto';
import { UsuarioService } from '../services/usuario.service';
import { GetClientIp } from 'src/auth/decorators';


@Controller('usuario')
export class UsuarioController {
  constructor(private readonly usuarioService: UsuarioService) {}

  @Post('create')
  create(@Body() createUsuarioDto: CreateUpdateUsuarioDto) {
    return this.usuarioService.create(createUsuarioDto);
  }

  @Post('create-with-persona')
  async createUsuarioWithPersona(
    @Body() createUsuarioWithPersonaDto: CreateUsuarioWithPersonaDto,
    @GetClientIp() ip: string,
  ) {
    return this.usuarioService.createUsuarioWithPersona(createUsuarioWithPersonaDto, ip);
  }

  @Get()
  findAll() {
    return this.usuarioService.findAll();
  }
}
