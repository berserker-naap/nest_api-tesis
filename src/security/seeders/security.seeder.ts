import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Accion } from '../entities/accion.entity';
import { Modulo } from '../entities/modulo.entity';
import { Opcion } from '../entities/opcion.entity';
import { Permiso } from '../entities/permiso.entity';
import { Rol } from '../entities/rol.entity';

type PermissionMatrixEntry = {
  role: string;
  paths: string[] | '*';
  actions: string[] | '*';
};

@Injectable()
export class SecuritySeeder implements OnModuleInit {
  constructor(
    @InjectRepository(Accion)
    private readonly accionRepository: Repository<Accion>,
    @InjectRepository(Modulo)
    private readonly moduloRepository: Repository<Modulo>,
    @InjectRepository(Opcion)
    private readonly opcionRepository: Repository<Opcion>,
    @InjectRepository(Permiso)
    private readonly permisoRepository: Repository<Permiso>,
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

  private readonly rolesBase = [
    'ADMINISTRADOR',
    'MANTENEDOR',
    'SOPORTE',
    'FINANZAS',
    'CLIENTE',
  ];

  private readonly modulosOpcionesBase = [
    {
      nombre: 'Seguridad',
      icono: 'pi pi-fw pi-shield',
      opciones: [
        { nombre: 'Usuarios', path: '/security/usuarios' },
        { nombre: 'Roles', path: '/security/roles' },
        { nombre: 'Permisos', path: '/security/permisos' },
        { nombre: 'Modulos', path: '/security/modulos' },
        { nombre: 'Opciones', path: '/security/opciones' },
        { nombre: 'Acciones', path: '/security/acciones' },
        { nombre: 'Multitabla', path: '/security/multitabla' },
        { nombre: 'Reportes', path: '/security/reportes' },
      ],
    },
    {
      nombre: 'Comunicaciones',
      icono: 'pi pi-fw pi-megaphone',
      opciones: [
        { nombre: 'Campanas', path: '/security/campanas' },
      ],
    },
    {
      nombre: 'Finanzas',
      icono: 'pi pi-fw pi-wallet',
      opciones: [
        { nombre: 'Resumen financiero', path: '/finance/resumen' },
        { nombre: 'Catalogos financieros', path: '/finance/catalogos' },
      ],
    },
  ];

  private readonly matrizPermisosBase: PermissionMatrixEntry[] = [
    {
      role: 'ADMINISTRADOR',
      paths: '*',
      actions: '*',
    },
    {
      role: 'MANTENEDOR',
      paths: ['/security/multitabla', '/security/campanas'],
      actions: ['Listar', 'Ver Detalle', 'Crear', 'Editar', 'Eliminar', 'Guardar', 'Exportar'],
    },
    {
      role: 'SOPORTE',
      paths: ['/security/reportes'],
      actions: ['Listar', 'Ver Detalle', 'Exportar'],
    },
    {
      role: 'FINANZAS',
      paths: ['/finance/resumen'],
      actions: ['Listar', 'Ver Detalle', 'Exportar'],
    },
    {
      role: 'FINANZAS',
      paths: ['/finance/catalogos'],
      actions: ['Listar', 'Ver Detalle', 'Crear', 'Editar', 'Eliminar', 'Guardar', 'Exportar'],
    },
  ];

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
    await this.ensureModulosOpciones();
    await this.ensurePermisosBase();
    this.initialized = true;
  }

  private async ensureAcciones(): Promise<void> {
    const current = await this.accionRepository.find();

    const byName = new Map(current.map((row) => [row.nombre.trim().toUpperCase(), row]));
    const missing = this.accionesBase.filter((name) => !byName.has(name.toUpperCase()));
    const inactive = this.accionesBase
      .map((name) => byName.get(name.toUpperCase()))
      .filter((row): row is Accion => !!row && (row.eliminado || !row.activo));

    if (inactive.length) {
      await this.accionRepository.save(
        inactive.map((accion) => ({
          ...accion,
          activo: true,
          eliminado: false,
          usuarioModificacion: 'system',
          ipModificacion: '127.0.0.1',
          fechaModificacion: new Date(),
        })),
      );
    }

    if (missing.length) {
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
  }

  private async ensureRoles(): Promise<void> {
    const current = await this.rolRepository.find();

    const byName = new Map(current.map((row) => [row.nombre.trim().toUpperCase(), row]));
    const missing = this.rolesBase.filter((name) => !byName.has(name.toUpperCase()));
    const inactive = this.rolesBase
      .map((name) => byName.get(name.toUpperCase()))
      .filter((row): row is Rol => !!row && (row.eliminado || !row.activo));

    if (inactive.length) {
      await this.rolRepository.save(
        inactive.map((rol) => ({
          ...rol,
          activo: true,
          eliminado: false,
          usuarioModificacion: 'system',
          ipModificacion: '127.0.0.1',
          fechaModificacion: new Date(),
        })),
      );
    }

    if (missing.length) {
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

  private async ensureModulosOpciones(): Promise<void> {
    const currentModules = await this.moduloRepository.find();
    const modulesByName = new Map(
      currentModules.map((row) => [row.nombre.trim().toUpperCase(), row]),
    );

    for (const moduloBase of this.modulosOpcionesBase) {
      let modulo = modulesByName.get(moduloBase.nombre.toUpperCase());

      if (!modulo) {
        modulo = await this.moduloRepository.save(
          this.moduloRepository.create({
            nombre: moduloBase.nombre,
            icono: moduloBase.icono,
            usuarioRegistro: 'system',
            ipRegistro: '127.0.0.1',
          }),
        );
        modulesByName.set(moduloBase.nombre.toUpperCase(), modulo);
      } else if (modulo.eliminado || !modulo.activo || modulo.icono !== moduloBase.icono) {
        modulo.activo = true;
        modulo.eliminado = false;
        modulo.icono = moduloBase.icono;
        modulo.usuarioModificacion = 'system';
        modulo.ipModificacion = '127.0.0.1';
        modulo.fechaModificacion = new Date();
        modulo = await this.moduloRepository.save(modulo);
      }

      await this.ensureOpcionesModulo(modulo, moduloBase.opciones);
    }
  }

  private async ensureOpcionesModulo(
    modulo: Modulo,
    opcionesBase: Array<{ nombre: string; path: string }>,
  ): Promise<void> {
    const currentOptions = await this.opcionRepository.find({
      relations: { modulo: true },
    });
    const optionsByPath = new Map(
      currentOptions
        .filter((row) => row.path)
        .map((row) => [this.normalizePath(row.path), row]),
    );

    for (const opcionBase of opcionesBase) {
      const path = this.normalizePath(opcionBase.path);
      const opcion = optionsByPath.get(path);

      if (!opcion) {
        await this.opcionRepository.save(
          this.opcionRepository.create({
            modulo,
            nombre: opcionBase.nombre,
            path,
            isVisibleNavegacion: true,
            usuarioRegistro: 'system',
            ipRegistro: '127.0.0.1',
          }),
        );
        continue;
      }

      if (
        opcion.eliminado ||
        !opcion.activo ||
        opcion.nombre !== opcionBase.nombre ||
        opcion.modulo?.id !== modulo.id ||
        opcion.isVisibleNavegacion !== true
      ) {
        opcion.activo = true;
        opcion.eliminado = false;
        opcion.nombre = opcionBase.nombre;
        opcion.modulo = modulo;
        opcion.isVisibleNavegacion = true;
        opcion.usuarioModificacion = 'system';
        opcion.ipModificacion = '127.0.0.1';
        opcion.fechaModificacion = new Date();
        await this.opcionRepository.save(opcion);
      }
    }
  }

  private async ensurePermisosBase(): Promise<void> {
    const [roles, opciones, acciones, permisos] = await Promise.all([
      this.rolRepository.find({ where: { activo: true, eliminado: false } }),
      this.opcionRepository.find({ where: { activo: true, eliminado: false } }),
      this.accionRepository.find({ where: { activo: true, eliminado: false } }),
      this.permisoRepository.find({
        where: { eliminado: false },
        relations: { rol: true, opcion: true, accion: true },
      }),
    ]);
    const rolesByName = new Map(roles.map((row) => [row.nombre.trim().toUpperCase(), row]));
    const accionesByName = new Map(acciones.map((row) => [row.nombre.trim().toUpperCase(), row]));
    const opcionesByPath = new Map(
      opciones
        .filter((row) => row.path)
        .map((row) => [this.normalizePath(row.path), row]),
    );
    const existing = new Set(
      permisos.map((row) => `${row.rol?.id}-${row.opcion?.id}-${row.accion?.id}`),
    );
    const nuevos: Permiso[] = [];

    for (const entry of this.matrizPermisosBase) {
      const rol = rolesByName.get(entry.role.toUpperCase());
      if (!rol) continue;

      const targetOptions = entry.paths === '*'
        ? opciones.filter((opcion) => !!opcion.path)
        : entry.paths.map((path) => opcionesByPath.get(this.normalizePath(path))).filter((opcion): opcion is Opcion => !!opcion);
      const targetActions = entry.actions === '*'
        ? acciones
        : entry.actions.map((name) => accionesByName.get(name.toUpperCase())).filter((accion): accion is Accion => !!accion);

      for (const opcion of targetOptions) {
        for (const accion of targetActions) {
          const key = `${rol.id}-${opcion.id}-${accion.id}`;
          if (existing.has(key)) continue;

          existing.add(key);
          nuevos.push(
            this.permisoRepository.create({
              rol,
              opcion,
              accion,
              usuarioRegistro: 'system',
              ipRegistro: '127.0.0.1',
            }),
          );
        }
      }
    }

    if (nuevos.length) {
      await this.permisoRepository.save(nuevos);
    }
  }

  private normalizePath(value: string | null | undefined): string {
    const normalized = `${value ?? ''}`.trim().toLowerCase().replace(/\/+$/, '');
    if (!normalized) return '';
    return normalized.startsWith('/') ? normalized : `/${normalized}`;
  }
}
