import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoriaFinance } from '../entities/categoria-finance.entity';
import { EntidadFinanciera } from '../entities/entidad-financiera.entity';
import { Moneda } from '../entities/moneda.entity';
import { SubcategoriaFinance } from '../entities/subcategoria-finance.entity';
import { TipoCuenta } from '../entities/tipo-cuenta.entity';

@Injectable()
export class FinanceSeeder implements OnModuleInit {
  constructor(
    @InjectRepository(Moneda)
    private readonly monedaRepository: Repository<Moneda>,
    @InjectRepository(TipoCuenta)
    private readonly tipoCuentaRepository: Repository<TipoCuenta>,
    @InjectRepository(EntidadFinanciera)
    private readonly entidadFinancieraRepository: Repository<EntidadFinanciera>,
    @InjectRepository(CategoriaFinance)
    private readonly categoriaRepository: Repository<CategoriaFinance>,
    @InjectRepository(SubcategoriaFinance)
    private readonly subcategoriaRepository: Repository<SubcategoriaFinance>,
  ) {}

  private readonly monedasSeed: Pick<Moneda, 'codigo' | 'nombre' | 'simbolo'>[] = [
    { codigo: 'PEN', nombre: 'Sol Peruano', simbolo: 'S/' },
    { codigo: 'USD', nombre: 'Dolar Americano', simbolo: '$' },
  ];

  private readonly tiposCuentaSeed: Pick<TipoCuenta, 'nombre' | 'naturaleza'>[] = [
    { nombre: 'Cuenta Sueldo', naturaleza: 'ACTIVO' },
    { nombre: 'Ahorros', naturaleza: 'ACTIVO' },
    { nombre: 'Efectivo', naturaleza: 'ACTIVO' },
    { nombre: 'Tarjeta Credito', naturaleza: 'PASIVO' },
  ];

  private readonly entidadesSeed: Pick<EntidadFinanciera, 'nombre' | 'tipo' | 'iconoUrl'>[] = [
    { nombre: 'BCP', tipo: 'BANCO', iconoUrl: null },
    { nombre: 'BBVA', tipo: 'BANCO', iconoUrl: null },
    { nombre: 'Interbank', tipo: 'BANCO', iconoUrl: null },
    { nombre: 'Yape', tipo: 'BILLETERA', iconoUrl: null },
    { nombre: 'Plin', tipo: 'BILLETERA', iconoUrl: null },
  ];

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
    {
      tipo: 'EGRESO',
      nombre: 'Entretenimiento',
      icono: null,
      colorHex: '#db2777',
      orden: 8,
    },
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

  private initialized = false;

  async onModuleInit(): Promise<void> {
    await this.ensureBaseData();
  }

  async ensureBaseData(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const monedas = await this.monedaRepository.find();
    if (!monedas.length) {
      await this.monedaRepository.save(
        this.monedasSeed.map((item) =>
          this.monedaRepository.create({
            ...item,
            usuarioRegistro: 'SYSTEM',
            ipRegistro: '127.0.0.1',
          }),
        ),
      );
    }

    const tiposCuenta = await this.tipoCuentaRepository.find();
    if (!tiposCuenta.length) {
      await this.tipoCuentaRepository.save(
        this.tiposCuentaSeed.map((item) =>
          this.tipoCuentaRepository.create({
            ...item,
            usuarioRegistro: 'SYSTEM',
            ipRegistro: '127.0.0.1',
          }),
        ),
      );
    }

    const entidades = await this.entidadFinancieraRepository.find();
    if (!entidades.length) {
      await this.entidadFinancieraRepository.save(
        this.entidadesSeed.map((item) =>
          this.entidadFinancieraRepository.create({
            ...item,
            usuarioRegistro: 'SYSTEM',
            ipRegistro: '127.0.0.1',
          }),
        ),
      );
    }

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

    this.initialized = true;
  }
}
