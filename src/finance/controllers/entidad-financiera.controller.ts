import { Controller, Get } from '@nestjs/common';
import { Auth } from 'src/auth/decorators';
import { EntidadFinancieraService } from '../services/entidad-financiera.service';

@Controller('entidades-financieras')
@Auth()
export class EntidadFinancieraController {
  constructor(
    private readonly entidadFinancieraService: EntidadFinancieraService,
  ) {}

  @Get()
  findAll() {
    return this.entidadFinancieraService.findAll();
  }
}
