import { Controller, Get } from '@nestjs/common';
import { Auth } from 'src/auth/decorators';
import { TipoCuentaService } from '../services/tipo-cuenta.service';

@Controller('tipos-cuenta')
@Auth()
export class TipoCuentaController {
  constructor(private readonly tipoCuentaService: TipoCuentaService) {}

  @Get()
  findAll() {
    return this.tipoCuentaService.findAll();
  }
}
