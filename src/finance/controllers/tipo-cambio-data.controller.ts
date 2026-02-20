import { Controller, Get, Query } from '@nestjs/common';
import { Auth } from 'src/auth/decorators';
import { TipoCambioDataService } from '../services/tipo-cambio-data.service';

@Controller('tipo-cambio')
@Auth()
export class TipoCambioDataController {
  constructor(private readonly tipoCambioDataService: TipoCambioDataService) {}

  @Get('today')
  getToday() {
    return this.tipoCambioDataService.getToday();
  }

  @Get()
  getByFecha(@Query('fecha') fecha?: string) {
    if (!fecha) {
      return this.tipoCambioDataService.getToday();
    }
    return this.tipoCambioDataService.getByFecha(fecha);
  }

  @Get('historico')
  getHistorico(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Number(limit) : 60;
    return this.tipoCambioDataService.getHistorico(desde, hasta, parsedLimit);
  }
}
