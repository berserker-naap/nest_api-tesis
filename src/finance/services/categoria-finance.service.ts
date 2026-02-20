import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StatusResponse } from 'src/common/dto/response.dto';
import { Repository } from 'typeorm';
import { CategoriaFinance } from '../entities/categoria-finance.entity';
import { FinanceSeeder } from '../seeders/finance.seeder';

@Injectable()
export class CategoriaFinanceService {
  constructor(
    @InjectRepository(CategoriaFinance)
    private readonly categoriaRepository: Repository<CategoriaFinance>,
    private readonly financeSeeder: FinanceSeeder,
  ) {}

  async ensureCategoriasBase(): Promise<void> {
    await this.financeSeeder.ensureBaseData();
  }

  async findCategorias(tipo?: 'INGRESO' | 'EGRESO'): Promise<StatusResponse<any>> {
    try {
      await this.ensureCategoriasBase();
      const categorias = await this.categoriaRepository.find({
        where: {
          activo: true,
          eliminado: false,
          ...(tipo ? { tipo } : {}),
        },
        order: { orden: 'ASC', id: 'ASC' },
      });

      return new StatusResponse(true, 200, 'Categorias obtenidas', categorias);
    } catch (error) {
      console.error('Error al obtener categorias:', error);
      return new StatusResponse(false, 500, 'Error al obtener categorias', error);
    }
  }
}
