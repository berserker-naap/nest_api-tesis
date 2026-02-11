import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StatusResponse } from 'src/common/dto/response.dto';
import { Repository } from 'typeorm';
import { CategoriaFinance } from '../entities/categoria-finance.entity';
import { SubcategoriaFinance } from '../entities/subcategoria-finance.entity';

@Injectable()
export class CategoriaFinanceService {
  constructor(
    @InjectRepository(CategoriaFinance)
    private readonly categoriaRepository: Repository<CategoriaFinance>,
    @InjectRepository(SubcategoriaFinance)
    private readonly subcategoriaRepository: Repository<SubcategoriaFinance>,
  ) {}

  private readonly categoriasSeed: Array<
    Pick<CategoriaFinance, 'tipo' | 'nombre' | 'icono' | 'colorHex' | 'orden'>
  > = [
    { tipo: 'EGRESO', nombre: 'Gastos', icono: null, colorHex: '#64748b', orden: 1 },
    { tipo: 'EGRESO', nombre: 'Educacion', icono: null, colorHex: '#2563eb', orden: 2 },
    { tipo: 'EGRESO', nombre: 'Inversion', icono: null, colorHex: '#16a34a', orden: 3 },
    { tipo: 'EGRESO', nombre: 'Salud', icono: null, colorHex: '#dc2626', orden: 4 },
    { tipo: 'EGRESO', nombre: 'Alimentacion', icono: null, colorHex: '#f59e0b', orden: 5 },
    { tipo: 'EGRESO', nombre: 'Transporte', icono: null, colorHex: '#0891b2', orden: 6 },
    { tipo: 'EGRESO', nombre: 'Hogar', icono: null, colorHex: '#7c3aed', orden: 7 },
    { tipo: 'EGRESO', nombre: 'Entretenimiento', icono: null, colorHex: '#db2777', orden: 8 },
    { tipo: 'INGRESO', nombre: 'Sueldo', icono: null, colorHex: '#059669', orden: 100 },
    { tipo: 'INGRESO', nombre: 'Ingreso Extra', icono: null, colorHex: '#0284c7', orden: 101 },
  ];

  private readonly subcategoriasSeed: Record<string, string[]> = {
    Educacion: ['Cursos', 'Libros', 'Suscripciones'],
    Salud: ['Farmacia', 'Consulta', 'Seguro'],
    Transporte: ['Taxi', 'Gasolina', 'Mantenimiento'],
    Alimentacion: ['Supermercado', 'Restaurante', 'Delivery'],
    Hogar: ['Servicios', 'Mantenimiento', 'Muebles'],
    Entretenimiento: ['Streaming', 'Cine', 'Viajes'],
    Gastos: ['General'],
    Inversion: ['Fondos', 'Bolsa', 'Crypto'],
    Sueldo: ['Planilla'],
    'Ingreso Extra': ['Freelance', 'Comisiones', 'Ventas'],
  };

  async ensureCategoriasBase(): Promise<void> {
    const categorias = await this.categoriaRepository.find();
    if (!categorias.length) {
      const created = await this.categoriaRepository.save(
        this.categoriasSeed.map((item) =>
          this.categoriaRepository.create({
            ...item,
            usuario: null,
            usuarioRegistro: 'SYSTEM',
            ipRegistro: '127.0.0.1',
          }),
        ),
      );

      const subcategorias: SubcategoriaFinance[] = [];
      for (const categoria of created) {
        const nombres = this.subcategoriasSeed[categoria.nombre] ?? ['General'];
        for (let i = 0; i < nombres.length; i++) {
          subcategorias.push(
            this.subcategoriaRepository.create({
              categoria,
              nombre: nombres[i],
              orden: i + 1,
              usuario: null,
              usuarioRegistro: 'SYSTEM',
              ipRegistro: '127.0.0.1',
            }),
          );
        }
      }

      if (subcategorias.length) {
        await this.subcategoriaRepository.save(subcategorias);
      }
    }
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

  async findSubcategorias(idCategoria: number): Promise<StatusResponse<any>> {
    try {
      await this.ensureCategoriasBase();
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
        relations: ['categoria'],
        order: { orden: 'ASC', id: 'ASC' },
      });

      return new StatusResponse(
        true,
        200,
        'Subcategorias obtenidas',
        subcategorias,
      );
    } catch (error) {
      console.error('Error al obtener subcategorias:', error);
      return new StatusResponse(false, 500, 'Error al obtener subcategorias', error);
    }
  }
}
