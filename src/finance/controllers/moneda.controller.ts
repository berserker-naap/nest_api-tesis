import { Controller, Get } from '@nestjs/common';
import { Auth } from 'src/auth/decorators';
import { MonedaService } from '../services/moneda.service';

@Controller('monedas')
@Auth()
export class MonedaController {
  constructor(private readonly monedaService: MonedaService) {}

  @Get()
  findAll() {
    return this.monedaService.findAll();
  }
}
