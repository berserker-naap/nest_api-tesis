import {
  Body,
  Controller,
  Post,
  Put,
  Delete,
  Param,
  Get,
  Patch,
} from '@nestjs/common';
import { MultitablaService } from '../services/multitabla.service';
import { Auth, GetUsuario, GetClientIp } from 'src/auth/decorators';
import { Usuario } from 'src/security/entities/usuario.entity';
import { CreateUpdateMultitablaDto } from '../dto/multitabla.dto';

@Controller('multitabla')
export class MultitablaController {
  constructor(private readonly multitablaService: MultitablaService) {}

  @Get()
  @Auth()
  findAll() {
    return this.multitablaService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.multitablaService.findOne(+id);
  }

  @Post()
  @Auth()
  create(
    @Body() dto: CreateUpdateMultitablaDto,
    @GetUsuario() user: Usuario,
    @GetClientIp() ip: string,
  ) {
    return this.multitablaService.create(dto, user.login, ip);
  }

  @Patch(':id')
  @Auth()
  async update(
    @Param('id') id: number,
    @Body() dto: CreateUpdateMultitablaDto,
    @GetUsuario() user: Usuario,
    @GetClientIp() ip: string,
  ) {
    dto.id = +id; // aseguramos que la cabecera tenga el ID de la URL
    return this.multitablaService.update(dto, user.login, ip);
  }

  @Delete(':id')
  @Auth()
  async delete(
    @Param('id') id: number,
    @GetUsuario() user: Usuario,
    @GetClientIp() ip: string,
  ) {
    return this.multitablaService.delete(+id, user.login, ip);
  }

  @Post('delete-all')
  @Auth()
  deleteMany(
    @Body() ids: number[],
    @GetUsuario() user: Usuario,
    @GetClientIp() ip: string,
  ) {
    return this.multitablaService.deleteMany(ids, user.login, ip);
  }
}
