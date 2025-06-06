import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { Auth, GetUsuario } from 'src/auth/decorators';
import { Usuario } from '../entities/usuario.entity';
import { PersonaService } from '../services/persona.service';
import { CreateUpdatePersonaDto } from '../dto/persona.dto';
import { GetClientIp } from 'src/auth/decorators/get-client-ip.decorator';

@Controller('persona')
export class PersonaController {
  constructor(private readonly personaService: PersonaService) {}

  @Get()
  @Auth()
  findAll() {
    return this.personaService.findAll();
  }

  @Get(':id')
  @Auth()
  findOne(@Param('id') id: number) {
    return this.personaService.findOne(id);
  }

  @Post()
  @Auth()
  create(@Body() dto: CreateUpdatePersonaDto, @GetUsuario() user: Usuario,  @GetClientIp() ip: string) {
    return this.personaService.create(dto, user.login, ip);
  }

  @Patch(':id')
  @Auth()
  update(@Param('id') id: number,@Body() dto: CreateUpdatePersonaDto, @GetUsuario() user: Usuario,  @GetClientIp() ip: string) {
    return this.personaService.update(id,dto, user.login, ip);
  }

  @Delete(':id')
  @Auth()
  delete(@Param('id') id: number, @GetUsuario() user: Usuario,  @GetClientIp() ip: string) {
    return this.personaService.delete(id, user.login, ip);
  }

  @Post('delete-all')
  @Auth()
  deleteMany(@Body() ids: number[], @GetUsuario() user: Usuario,  @GetClientIp() ip: string) {
    return this.personaService.deleteMany(ids, user.login, ip);
  }
}