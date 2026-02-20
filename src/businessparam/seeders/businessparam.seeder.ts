import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Multitabla } from '../entities/multitabla.entity';

@Injectable()
export class BusinessparamSeeder implements OnModuleInit {
  constructor(
    @InjectRepository(Multitabla)
    private readonly multitablaRepository: Repository<Multitabla>,
  ) {}

  private readonly audit = {
    usuarioRegistro: 'admin',
    ipRegistro: '127.0.0.1',
  };

  private initialized = false;

  async onModuleInit(): Promise<void> {
    await this.ensureBaseData();
  }

  async ensureBaseData(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const tipoDocumentoHeader = await this.findOrCreateHeader('TIPO DE DOCUMENTO');
    const sexoHeader = await this.findOrCreateHeader('SEXO');

    await this.seedItems(tipoDocumentoHeader.id, [
      { valor: 'DNI', nombre: 'Documento Nacional de Identidad' },
      { valor: 'RUC', nombre: 'Registro Unico de Contribuyentes' },
      { valor: 'CE', nombre: 'Carne de Extranjeria' },
      { valor: 'PAS', nombre: 'Pasaporte' },
      { valor: 'OTRO', nombre: 'Otro' },
    ]);

    await this.seedItems(sexoHeader.id, [
      { valor: 'M', nombre: 'Masculino' },
      { valor: 'F', nombre: 'Femenino' },
      { valor: 'NB', nombre: 'No binario' },
      { valor: 'ND', nombre: 'Prefiero no decirlo' },
    ]);

    this.initialized = true;
  }

  private async findOrCreateHeader(nombre: string): Promise<Multitabla> {
    const existing = await this.multitablaRepository.findOne({
      where: {
        idMultitabla: IsNull(),
        nombre,
        activo: true,
        eliminado: false,
      },
    });
    if (existing) {
      return existing;
    }

    const header = this.multitablaRepository.create({
      idMultitabla: null,
      nombre,
      ...this.audit,
    });
    return this.multitablaRepository.save(header);
  }

  private async seedItems(
    idMultitabla: number,
    items: Array<{ valor: string; nombre: string }>,
  ): Promise<void> {
    const current = await this.multitablaRepository.find({
      where: {
        idMultitabla,
        activo: true,
        eliminado: false,
      },
    });

    const currentValues = new Set(
      current
        .map((item) => item.valor?.trim().toUpperCase())
        .filter((value): value is string => !!value),
    );

    const missing = items.filter((item) => !currentValues.has(item.valor));
    if (!missing.length) {
      return;
    }

    await this.multitablaRepository.save(
      missing.map((item) =>
        this.multitablaRepository.create({
          idMultitabla,
          valor: item.valor,
          nombre: item.nombre,
          ...this.audit,
        }),
      ),
    );
  }
}
