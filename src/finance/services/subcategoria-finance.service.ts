import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StatusResponse } from 'src/common/dto/response.dto';
import { Repository } from 'typeorm';
import { SubcategoriaFinanceResponseDto } from '../dto/categoria-finance.dto';
import { CategoriaFinance } from '../entities/categoria-finance.entity';
import { SubcategoriaFinance } from '../entities/subcategoria-finance.entity';
import { CategoriaFinanceService } from './categoria-finance.service';

@Injectable()
export class SubcategoriaFinanceService {
  constructor(
    @InjectRepository(SubcategoriaFinance)
    private readonly subcategoriaRepository: Repository<SubcategoriaFinance>,
    @InjectRepository(CategoriaFinance)
    private readonly categoriaRepository: Repository<CategoriaFinance>,
    private readonly categoriaFinanceService: CategoriaFinanceService,
  ) {}

  async findByCategoria(
    idCategoria: number,
  ): Promise<StatusResponse<SubcategoriaFinanceResponseDto[] | any>> {
    try {
      await this.categoriaFinanceService.ensureCategoriasBase();

      const categoria = await this.categoriaRepository.findOne({
        where: { id: idCategoria, activo: true, eliminado: false },
      });
      if (!categoria) {
        throw new NotFoundException('Categoria no encontrada');
      }

      const subcategorias = await this.subcategoriaRepository.find({
        where: {
          categoria: { id: idCategoria },
          activo: true,
          eliminado: false,
        },
        order: { orden: 'ASC', id: 'ASC' },
      });

      const data: SubcategoriaFinanceResponseDto[] = subcategorias.map((item) => ({
        id: item.id,
        nombre: item.nombre,
        orden: item.orden,
      }));

      return new StatusResponse(true, 200, 'Subcategorias obtenidas', data);
    } catch (error) {
      console.error('Error al obtener subcategorias:', error);
      return new StatusResponse(false, 500, 'Error al obtener subcategorias', error);
    }
  }
}
