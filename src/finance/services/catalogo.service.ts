import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StatusResponse } from 'src/common/dto/response.dto';
import { Repository } from 'typeorm';
import { Moneda } from '../entities/moneda.entity';
import { TipoCuenta } from '../entities/tipo-cuenta.entity';
import { EntidadFinanciera } from '../entities/entidad-financiera.entity';

@Injectable()
export class CatalogoService {
  constructor(
    @InjectRepository(Moneda)
    private readonly monedaRepository: Repository<Moneda>,
    @InjectRepository(TipoCuenta)
    private readonly tipoCuentaRepository: Repository<TipoCuenta>,
    @InjectRepository(EntidadFinanciera)
    private readonly entidadFinancieraRepository: Repository<EntidadFinanciera>,
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

  async ensureCatalogosBase(): Promise<void> {
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
  }

  async findAll(): Promise<StatusResponse<any>> {
    try {
      await this.ensureCatalogosBase();

      const [monedas, tiposCuenta, entidadesFinancieras] = await Promise.all([
        this.monedaRepository.find({ where: { activo: true, eliminado: false } }),
        this.tipoCuentaRepository.find({
          where: { activo: true, eliminado: false },
        }),
        this.entidadFinancieraRepository.find({
          where: { activo: true, eliminado: false },
        }),
      ]);

      return new StatusResponse(true, 200, 'Catalogos obtenidos', {
        monedas,
        tiposCuenta,
        entidadesFinancieras,
      });
    } catch (error) {
      console.error('Error al obtener catalogos:', error);
      return new StatusResponse(false, 500, 'Error al obtener catalogos', error);
    }
  }

  async findMonedas(): Promise<StatusResponse<any>> {
    try {
      await this.ensureCatalogosBase();
      const monedas = await this.monedaRepository.find({
        where: { activo: true, eliminado: false },
      });
      return new StatusResponse(true, 200, 'Monedas obtenidas', monedas);
    } catch (error) {
      return new StatusResponse(false, 500, 'Error al obtener monedas', error);
    }
  }

  async findTiposCuenta(): Promise<StatusResponse<any>> {
    try {
      await this.ensureCatalogosBase();
      const tiposCuenta = await this.tipoCuentaRepository.find({
        where: { activo: true, eliminado: false },
      });
      return new StatusResponse(true, 200, 'Tipos de cuenta obtenidos', tiposCuenta);
    } catch (error) {
      return new StatusResponse(
        false,
        500,
        'Error al obtener tipos de cuenta',
        error,
      );
    }
  }

  async findEntidadesFinancieras(): Promise<StatusResponse<any>> {
    try {
      await this.ensureCatalogosBase();
      const entidadesFinancieras = await this.entidadFinancieraRepository.find({
        where: { activo: true, eliminado: false },
      });
      return new StatusResponse(
        true,
        200,
        'Entidades financieras obtenidas',
        entidadesFinancieras,
      );
    } catch (error) {
      return new StatusResponse(
        false,
        500,
        'Error al obtener entidades financieras',
        error,
      );
    }
  }
}

