import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StatusResponseDto } from 'src/common/dto/response.dto';
import { DataSource, Repository, IsNull, In } from 'typeorm';
import { Multitabla } from '../entities/multitabla.entity';
import { CreateUpdateMultitablaDto } from '../dto/multitabla.dto';

@Injectable()
export class MultitablaService {
  constructor(
    @InjectRepository(Multitabla)
    private readonly multitablaRepository: Repository<Multitabla>,
    private readonly dataSource: DataSource,
  ) { }


  async findAll(): Promise<StatusResponseDto<any>> {
    try {
      const cabeceras = await this.multitablaRepository.find({
        where: {
          idMultitabla: IsNull(), activo: true,
          eliminado: false,
        },
        order: { nombre: 'ASC' }, // opcional: ordenar por nombre
      });

      return new StatusResponseDto(true, 200, 'Cabeceras obtenidas', cabeceras);
    } catch (error) {
      return new StatusResponseDto(false, 500, 'Error al obtener cabeceras', error);
    }
  }

  async findOne(id: number): Promise<StatusResponseDto<any>> {
    try {
      // 1. Obtener cabecera
      const cabecera = await this.multitablaRepository.findOne({
        where: {
          id, activo: true,
          eliminado: false,
        },
      });

      if (!cabecera || cabecera.idMultitabla !== null) {
        return new StatusResponseDto(false, 404, 'Cabecera no encontrada', null);
      }

      // 2. Obtener sus items
      const items = await this.multitablaRepository.find({
        where: {
          idMultitabla: id, activo: true,
          eliminado: false,
        },
        order: { nombre: 'ASC' },
      });

      // 3. Armar DTO como salida
      const result: CreateUpdateMultitablaDto = {
        id: cabecera.id,
        nombre: cabecera.nombre,
        valor: cabecera.valor,
        valor2: cabecera.valor2,
        items: items.map((item) => ({
          id: item.id, // <-- incluir
          nombre: item.nombre,
          valor: item.valor,
          valor2: item.valor2,
        })),
      };

      return new StatusResponseDto(true, 200, 'Cabecera encontrada', result);
    } catch (error) {
      return new StatusResponseDto(false, 500, 'Error al obtener cabecera', error);
    }
  }

  async create(dto: CreateUpdateMultitablaDto, usuario: string, ip: string): Promise<StatusResponseDto<any>> {
    const resultados: Multitabla[] = [];
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Insertar la cabecera (sin idMultitabla)
      const cabecera = this.multitablaRepository.create({
        nombre: dto.nombre,
        valor: dto.valor,
        valor2: dto.valor2,
        idMultitabla: undefined,
        usuarioRegistro: usuario,
        ipRegistro: ip,
      });
      const savedCabecera = await queryRunner.manager.save(cabecera);
      resultados.push(savedCabecera);

      // 2. Insertar sus items con idMultitabla = cabecera.id
      if (dto.items?.length) {
        for (const item of dto.items) {
          const detalle = this.multitablaRepository.create({
            nombre: item.nombre,
            valor: item.valor,
            valor2: item.valor2,
            idMultitabla: savedCabecera.id,
            usuarioRegistro: usuario,
            ipRegistro: ip,
          });
          const savedDetalle = await queryRunner.manager.save(detalle);
          resultados.push(savedDetalle);
        }
      }

      await queryRunner.commitTransaction();
      return new StatusResponseDto(true, 201, 'Registro creado exitosamente', savedCabecera);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      return new StatusResponseDto(false, 500, 'Error al crear registro', error);
    } finally {
      await queryRunner.release();
    }
  }

  async update(dto: CreateUpdateMultitablaDto, usuario: string, ip: string): Promise<StatusResponseDto<any>> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const cabecera = await this.multitablaRepository.findOne({ where: { id: dto.id } });

      if (!cabecera || cabecera.idMultitabla !== null) {
        return new StatusResponseDto(false, 404, 'Cabecera no encontrada', null);
      }
      // Verificar si la cabecera cambió y actualizar
      cabecera.nombre = dto.nombre;
      if (dto.valor !== undefined) {
        cabecera.valor = dto.valor;
      }

      if (dto.valor2 !== undefined) {
        cabecera.valor2 = dto.valor2;
      }
      cabecera.fechaModificacion = new Date();
      cabecera.usuarioModificacion = usuario;
      cabecera.ipModificacion = ip;

      const updatedCabecera = await queryRunner.manager.save(cabecera);

      // 1. Obtener los items actuales desde la BD
      const existingItems = await this.multitablaRepository.find({
        where: { idMultitabla: dto.id }
      });

      const existingItemMap = new Map<number, Multitabla>();
      existingItems.forEach(item => existingItemMap.set(item.id, item));

      const processedIds = new Set<number>();
      const nuevosItems: Multitabla[] = [];

      // 2. Procesar todos los items del dto
      if (dto.items?.length) {
        for (const itemDto of dto.items) {
          const idItem = itemDto.id;

          if (idItem && existingItemMap.has(idItem)) {
            // UPDATE
            const itemExistente: any = existingItemMap.get(idItem);
            Object.assign(itemExistente, {
              nombre: itemDto.nombre,
              valor: itemDto.valor,
              valor2: itemDto.valor2,
              fechaModificacion: new Date(),
              usuarioModificacion: usuario,
              ipModificacion: ip,
            });
            await queryRunner.manager.save(itemExistente);
            processedIds.add(idItem);
          } else {
            // INSERT
            const nuevoItem = this.multitablaRepository.create({
              nombre: itemDto.nombre,
              valor: itemDto.valor,
              valor2: itemDto.valor2,
              idMultitabla: dto.id,
              usuarioRegistro: usuario,
              ipRegistro: ip,
            });
            const savedItem = await queryRunner.manager.save(nuevoItem);
            nuevosItems.push(savedItem);
          }
        }
      }

      // 3. Eliminar los items que ya existían pero NO están en dto
      const idsRecibidos = dto.items?.map(i => i.id).filter(Boolean) ?? [];
      const idsEliminar = existingItems
        .filter(item => !idsRecibidos.includes(item.id))
        .map(item => item.id);

      if (idsEliminar.length > 0) {
        for (const id of idsEliminar) {
          await queryRunner.manager.update(Multitabla, id, {
            activo: false,
            eliminado: true,
            usuarioEliminacion: usuario,
            ipEliminacion: ip,
            fechaEliminacion: new Date(),
          });
        }
      }




      await queryRunner.commitTransaction();

      return new StatusResponseDto(true, 200, 'Cabecera e items actualizados correctamente', updatedCabecera);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Error en update multitabla:', error);
      return new StatusResponseDto(false, 500, 'Error al actualizar registro', error);
    } finally {
      await queryRunner.release();
    }
  }

  async eliminar(id: number, usuarioEliminacion: string, ipEliminacion?: string): Promise<StatusResponseDto<null>> {
    try {
      const found = await this.multitablaRepository.findOne({ where: { id , activo: true,
          eliminado: false,} });
      if (!found) {
        return new StatusResponseDto(false, 404, 'Registro no encontrado', null);
      }

      await this.multitablaRepository.update(id, {
        eliminado: true,
        activo: false,
        usuarioEliminacion,
        ipEliminacion,
        fechaEliminacion: new Date(),
      });

      return new StatusResponseDto(true, 200, 'Registro eliminado (soft delete)', null);
    } catch (error) {
      console.error('Error en update multitabla:', error);
      return new StatusResponseDto(false, 500, 'Error al eliminar registro', error);
    }
  }

 async deleteMany(ids: number[], usuario: string, ip: string): Promise<StatusResponseDto<any>> {
    try {
      const acciones = await this.multitablaRepository.findBy({ id: In(ids) });

      if (!acciones.length) {
        return new StatusResponseDto(false, 404, 'No se encontraron acciones para eliminar', null);
      }

      // Actualizar campos de auditoría antes de eliminar
      const auditadas = acciones.map((accion) => {
        accion.usuarioEliminacion = usuario;
        accion.ipEliminacion = ip;
        accion.fechaEliminacion = new Date();
        return accion;
      });

      // Primero guardamos los cambios de auditoría
      await this.multitablaRepository.save(auditadas);

      // Luego eliminamos
      await this.multitablaRepository.remove(auditadas);

      return new StatusResponseDto(true, 200, 'Acciones eliminadas', ids);
    } catch (error) {
      return new StatusResponseDto(false, 500, 'Error al eliminar múltiples acciones', error);
    }
  }
}
