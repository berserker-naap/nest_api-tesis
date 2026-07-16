import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Auth, GetClientIp, GetUsuario } from 'src/auth/decorators';
import { Usuario } from 'src/security/entities/usuario.entity';
import {
  ActualizarTransaccionDto,
  CrearEgresoDto,
  CrearIngresoDto,
  CrearPagoTarjetaDto,
  CrearTransferenciaDto,
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

  @Post('transferencia')
  createTransferencia(
    @Body() dto: CrearTransferenciaDto,
    @GetUsuario() usuario: Usuario,
    @GetClientIp() ip: string,
  ) {
    return this.transaccionFinanceService.createTransferencia(dto, usuario, ip);
  }

  @Post('pago-tarjeta')
  createPagoTarjeta(
    @Body() dto: CrearPagoTarjetaDto,
    @GetUsuario() usuario: Usuario,
    @GetClientIp() ip: string,
  ) {
    return this.transaccionFinanceService.createPagoTarjeta(dto, usuario, ip);
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

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarTransaccionDto,
    @GetUsuario() usuario: Usuario,
    @GetClientIp() ip: string,
  ) {
    return this.transaccionFinanceService.update(id, dto, usuario, ip);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUsuario() usuario: Usuario,
    @GetClientIp() ip: string,
  ) {
    return this.transaccionFinanceService.remove(id, usuario, ip);
  }

}
