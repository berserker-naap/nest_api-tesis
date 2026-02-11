import { Controller, Get } from '@nestjs/common';
import { Auth } from 'src/auth/decorators';
import { CatalogoService } from '../services/catalogo.service';

@Controller('catalogos')
@Auth()
export class CatalogoController {
  constructor(private readonly catalogoService: CatalogoService) {}

  @Get()
  findAll() {
    return this.catalogoService.findAll();
  }

  @Get('monedas')
  findMonedas() {
    return this.catalogoService.findMonedas();
  }

  @Get('tipos-cuenta')
  findTiposCuenta() {
    return this.catalogoService.findTiposCuenta();
  }

  @Get('entidades-financieras')
  findEntidadesFinancieras() {
    return this.catalogoService.findEntidadesFinancieras();
  }
}
