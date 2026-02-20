import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { Auth } from 'src/auth/decorators';
import { SubcategoriaFinanceService } from '../services/subcategoria-finance.service';

@Controller('subcategorias')
@Auth()
export class SubcategoriaFinanceController {
  constructor(
    private readonly subcategoriaFinanceService: SubcategoriaFinanceService,
  ) {}

  @Get('categoria/:idCategoria')
  findByCategoria(@Param('idCategoria', ParseIntPipe) idCategoria: number) {
    return this.subcategoriaFinanceService.findByCategoria(idCategoria);
  }
}
