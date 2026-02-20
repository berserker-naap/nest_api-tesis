import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Accion } from '../entities/accion.entity';
import { Rol } from '../entities/rol.entity';

@Injectable()
export class SecuritySeeder implements OnModuleInit {
  constructor(
    @InjectRepository(Accion)
    private readonly accionRepository: Repository<Accion>,
    @InjectRepository(Rol)
    private readonly rolRepository: Repository<Rol>,
  ) {}

  private readonly accionesBase = [
    'Listar',
    'Ver Detalle',
    'Crear',
    'Editar',
    'Eliminar',
    'Guardar',
    'Exportar',
    'Imprimir',
  ];

  private readonly rolesBase = ['ADMINISTRADOR', 'CLIENTE'];

  private initialized = false;

  async onModuleInit(): Promise<void> {
    await this.ensureBaseData();
  }

  async ensureBaseData(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.ensureAcciones();
    await this.ensureRoles();
    this.initialized = true;
  }

  private async ensureAcciones(): Promise<void> {
    const current = await this.accionRepository.find({
      where: { activo: true, eliminado: false },
    });

    const byName = new Set(current.map((row) => row.nombre.trim().toUpperCase()));
    const missing = this.accionesBase.filter((name) => !byName.has(name.toUpperCase()));

    if (!missing.length) {
      return;
    }

    await this.accionRepository.save(
      missing.map((nombre) =>
        this.accionRepository.create({
          nombre,
          usuarioRegistro: 'system',
          ipRegistro: '127.0.0.1',
        }),
      ),
    );
  }

  private async ensureRoles(): Promise<void> {
    const current = await this.rolRepository.find({
      where: { activo: true, eliminado: false },
    });

    const byName = new Set(current.map((row) => row.nombre.trim().toUpperCase()));
    const missing = this.rolesBase.filter((name) => !byName.has(name.toUpperCase()));

    if (!missing.length) {
      return;
    }

    await this.rolRepository.save(
      missing.map((nombre) =>
        this.rolRepository.create({
          nombre,
          descripcion: null,
          usuarioRegistro: 'system',
          ipRegistro: '127.0.0.1',
        }),
      ),
    );
  }
}
