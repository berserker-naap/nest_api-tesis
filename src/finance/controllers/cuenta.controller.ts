import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { Auth, GetClientIp, GetUsuario } from 'src/auth/decorators';
import { Usuario } from 'src/security/entities/usuario.entity';
import { ConfigurarFechasTarjetaDto, CrearCuentaDto } from '../dto/cuenta.dto';
import { CuentaService } from '../services/cuenta.service';

@Controller('cuentas')
@Auth()
export class CuentaController {
  constructor(private readonly cuentaService: CuentaService) {}

  @Get()
  findAll(@GetUsuario() usuario: Usuario) {
    return this.cuentaService.findAll(usuario.id);
  }

  @Post()
  create(
    @Body() dto: CrearCuentaDto,
    @GetUsuario() usuario: Usuario,
    @GetClientIp() ip: string,
  ) {
    return this.cuentaService.create(dto, usuario.id, usuario.login, ip);
  }

  @Patch(':id/tarjeta-fechas')
  configurarFechasTarjeta(
    @Param('id', ParseIntPipe) idCuenta: number,
    @Body() dto: ConfigurarFechasTarjetaDto,
    @GetUsuario() usuario: Usuario,
    @GetClientIp() ip: string,
  ) {
    return this.cuentaService.configurarFechasTarjeta(
      idCuenta,
      dto,
      usuario,
      ip,
    );
  }
}
