import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TipoCategoriaFinance } from '../enum/categoria-finance.enum';
import { TipoEntidadFinanciera } from '../enum/entidad-financiera.enum';
import { NaturalezaTipoCuenta } from '../enum/tipo-cuenta.enum';
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
    { nombre: 'Efectivo', naturaleza: NaturalezaTipoCuenta.ACTIVO },
    { nombre: 'Tarjeta Debito', naturaleza: NaturalezaTipoCuenta.ACTIVO },
    { nombre: 'Cuenta Sueldo', naturaleza: NaturalezaTipoCuenta.ACTIVO },
    { nombre: 'Tarjeta Credito', naturaleza: NaturalezaTipoCuenta.PASIVO },
    { nombre: 'Deudas por Pagar', naturaleza: NaturalezaTipoCuenta.PASIVO },
    { nombre: 'Deudas por Cobrar', naturaleza: NaturalezaTipoCuenta.ACTIVO },
  ];

  private readonly entidadesSeed: Pick<EntidadFinanciera, 'nombre' | 'tipo' | 'iconoUrl'>[] = [
    { nombre: 'BCP', tipo: TipoEntidadFinanciera.BANCO, iconoUrl: 'bcp.png' },
    { nombre: 'BBVA', tipo: TipoEntidadFinanciera.BANCO, iconoUrl: 'bbva.png' },
    { nombre: 'Interbank', tipo: TipoEntidadFinanciera.BANCO, iconoUrl: 'interbank.png' },
    { nombre: 'Scotiabank', tipo: TipoEntidadFinanciera.BANCO, iconoUrl: 'scotiabank.png' },
    { nombre: 'Pichincha', tipo: TipoEntidadFinanciera.BANCO, iconoUrl: 'pichincha.png' },
    { nombre: 'Caja Arequipa', tipo: TipoEntidadFinanciera.CAJA, iconoUrl: 'caja-arequipa.png' },
    { nombre: 'Caja Los Andes', tipo: TipoEntidadFinanciera.CAJA, iconoUrl: 'caja-los-andes.png' },
    { nombre: 'Lemon Cash', tipo: TipoEntidadFinanciera.BILLETERA, iconoUrl: 'lemon-cash.png' },
  ];

  private readonly categoriasSeed: Array<
    Pick<CategoriaFinance, 'tipo' | 'nombre' | 'icono' | 'colorHex' | 'orden'>
  > = [
    {
      tipo: TipoCategoriaFinance.EGRESO,
      nombre: 'Gastos',
      icono: null,
      colorHex: '#64748b',
      orden: 1,
    },
    {
      tipo: TipoCategoriaFinance.EGRESO,
      nombre: 'Educacion',
      icono: null,
      colorHex: '#2563eb',
      orden: 2,
    },
    {
      tipo: TipoCategoriaFinance.EGRESO,
      nombre: 'Inversion',
      icono: null,
      colorHex: '#16a34a',
      orden: 3,
    },
    {
      tipo: TipoCategoriaFinance.EGRESO,
      nombre: 'Salud',
      icono: null,
      colorHex: '#dc2626',
      orden: 4,
    },
    {
      tipo: TipoCategoriaFinance.EGRESO,
      nombre: 'Alimentacion',
      icono: null,
      colorHex: '#f59e0b',
      orden: 5,
    },
    {
      tipo: TipoCategoriaFinance.EGRESO,
      nombre: 'Transporte',
      icono: null,
      colorHex: '#0891b2',
      orden: 6,
    },
    {
      tipo: TipoCategoriaFinance.EGRESO,
      nombre: 'Hogar',
      icono: null,
      colorHex: '#7c3aed',
      orden: 7,
    },
    {
      tipo: TipoCategoriaFinance.EGRESO,
      nombre: 'Entretenimiento',
      icono: null,
      colorHex: '#db2777',
      orden: 8,
    },
    {
      tipo: TipoCategoriaFinance.INGRESO,
      nombre: 'Sueldo',
      icono: null,
      colorHex: '#059669',
      orden: 100,
    },
    {
      tipo: TipoCategoriaFinance.INGRESO,
      nombre: 'Ingreso Extra',
      icono: null,
      colorHex: '#0284c7',
      orden: 101,
    },
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

    await this.syncTiposCuenta();
    await this.syncEntidadesFinancieras();

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

  private async syncTiposCuenta(): Promise<void> {
    const system = { usuarioRegistro: 'SYSTEM', ipRegistro: '127.0.0.1' };
    const existentes = await this.tipoCuentaRepository.find();
    const mapa = new Map(existentes.map((item) => [item.nombre, item]));
    const nombresSeed = this.tiposCuentaSeed.map((item) => item.nombre);

    for (const item of this.tiposCuentaSeed) {
      const found = mapa.get(item.nombre);
      if (found) {
        await this.tipoCuentaRepository.update(found.id, {
          naturaleza: item.naturaleza,
          activo: true,
          eliminado: false,
          ...system,
        });
        continue;
      }

      await this.tipoCuentaRepository.save(
        this.tipoCuentaRepository.create({
          ...item,
          ...system,
        }),
      );
    }

    const idsDesactivar = existentes
      .filter((item) => !nombresSeed.includes(item.nombre))
      .map((item) => item.id);

    if (idsDesactivar.length) {
      await this.tipoCuentaRepository.update(
        { id: In(idsDesactivar) },
        { activo: false, usuarioRegistro: system.usuarioRegistro, ipRegistro: system.ipRegistro },
      );
    }
  }

  private async syncEntidadesFinancieras(): Promise<void> {
    const system = { usuarioRegistro: 'SYSTEM', ipRegistro: '127.0.0.1' };
    const existentes = await this.entidadFinancieraRepository.find();
    const mapa = new Map(existentes.map((item) => [item.nombre, item]));
    const nombresSeed = this.entidadesSeed.map((item) => item.nombre);

    for (const item of this.entidadesSeed) {
      const found = mapa.get(item.nombre);
      if (found) {
        await this.entidadFinancieraRepository.update(found.id, {
          tipo: item.tipo,
          iconoUrl: item.iconoUrl,
          activo: true,
          eliminado: false,
          ...system,
        });
        continue;
      }

      await this.entidadFinancieraRepository.save(
        this.entidadFinancieraRepository.create({
          ...item,
          ...system,
        }),
      );
    }

    const idsDesactivar = existentes
      .filter((item) => !nombresSeed.includes(item.nombre))
      .map((item) => item.id);

    if (idsDesactivar.length) {
      await this.entidadFinancieraRepository.update(
        { id: In(idsDesactivar) },
        { activo: false, usuarioRegistro: system.usuarioRegistro, ipRegistro: system.ipRegistro },
      );
    }
  }
}
