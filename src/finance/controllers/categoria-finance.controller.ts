import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { Auth } from 'src/auth/decorators';
import { FiltroCategoriasDto } from '../dto/categoria-finance.dto';
import { CategoriaFinanceService } from '../services/categoria-finance.service';

@Controller('categorias')
@Auth()
export class CategoriaFinanceController {
  constructor(
    private readonly categoriaFinanceService: CategoriaFinanceService,
  ) {}

  @Get()
  findCategorias(@Query() query: FiltroCategoriasDto) {
    return this.categoriaFinanceService.findCategorias(query.tipo);
  }

  @Get(':id/subcategorias')
  findSubcategorias(@Param('id', ParseIntPipe) id: number) {
    return this.categoriaFinanceService.findSubcategorias(id);
  }
}
