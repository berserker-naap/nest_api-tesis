import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StatusResponse } from 'src/common/dto/response.dto';
import { Repository } from 'typeorm';
import { CategoriaFinanceResponseDto } from '../dto/categoria-finance.dto';
import { TipoCategoriaFinance } from '../enum/categoria-finance.enum';
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

  async findCategorias(
    tipo?: TipoCategoriaFinance,
  ): Promise<StatusResponse<CategoriaFinanceResponseDto[] | any>> {
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

      const data: CategoriaFinanceResponseDto[] = categorias.map((item) => ({
        id: item.id,
        tipo: item.tipo,
        nombre: item.nombre,
        icono: item.icono,
        colorHex: item.colorHex,
        orden: item.orden,
      }));

      return new StatusResponse(true, 200, 'Categorias obtenidas', data);
    } catch (error) {
      console.error('Error al obtener categorias:', error);
      return new StatusResponse(false, 500, 'Error al obtener categorias', error);
    }
  }
}
