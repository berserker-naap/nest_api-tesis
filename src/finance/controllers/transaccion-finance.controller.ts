import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { Auth, GetClientIp, GetUsuario } from 'src/auth/decorators';
import { Usuario } from 'src/security/entities/usuario.entity';
import {
  CrearEgresoDto,
  CrearIngresoDto,
  FiltroTransaccionesDto,
} from '../dto/transaccion.dto';
import { TransaccionFinanceService } from '../services/transaccion-finance.service';

@Controller('transacciones')
@Auth()
export class TransaccionFinanceController {
  constructor(
    private readonly transaccionFinanceService: TransaccionFinanceService,
  ) {}

  @Post('egreso')
  createEgreso(
    @Body() dto: CrearEgresoDto,
    @GetUsuario() usuario: Usuario,
    @GetClientIp() ip: string,
  ) {
    return this.transaccionFinanceService.createEgreso(dto, usuario, ip);
  }

  @Post('ingreso')
  createIngreso(
    @Body() dto: CrearIngresoDto,
    @GetUsuario() usuario: Usuario,
    @GetClientIp() ip: string,
  ) {
    return this.transaccionFinanceService.createIngreso(dto, usuario, ip);
  }

  @Get()
  findAll(
    @Query() query: FiltroTransaccionesDto,
    @GetUsuario() usuario: Usuario,
  ) {
    return this.transaccionFinanceService.findAll(query, usuario);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @GetUsuario() usuario: Usuario,
  ) {
    return this.transaccionFinanceService.findOneById(id, usuario);
  }
}
