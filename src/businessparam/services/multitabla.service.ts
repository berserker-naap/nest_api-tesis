import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StatusResponse } from 'src/common/dto/response.dto';
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

  async findAll(): Promise<StatusResponse<any>> {
    try {
      const cabeceras = await this.multitablaRepository.find({
        where: {
          idMultitabla: IsNull(),
          activo: true,
          eliminado: false,
        },
        order: { nombre: 'ASC' }, // opcional: ordenar por nombre
      });

      return new StatusResponse(true, 200, 'Multitablas obtenidas', cabeceras);
    } catch (error) {
      return new StatusResponse(
        false,
        500,
        'Error al obtener multitablas',
        error,
      );
    }
  }

  async findOne(id: number): Promise<StatusResponse<any>> {
    try {
      // 1. Obtener cabecera
      const cabecera = await this.multitablaRepository.findOne({
        where: {
          id,
          activo: true,
          eliminado: false,
        },
      });

      if (!cabecera || cabecera.idMultitabla !== null) {
        return new StatusResponse(false, 404, 'Cabecera no encontrada', null);
      }

      // 2. Obtener sus items
      const items = await this.multitablaRepository.find({
        where: {
          idMultitabla: id,
          activo: true,
          eliminado: false,
        },
        order: { id: 'ASC' },
      });

      // 3. Armar DTO como salida
      const result: CreateUpdateMultitablaDto = {
        id: cabecera.id,
        nombre: cabecera.nombre,
        valor: cabecera.valor ?? null,
        valor2: cabecera.valor2 ?? null,
        items: items.map((item) => ({
          id: item.id, // <-- incluir
          nombre: item.nombre,
          valor: item.valor ?? null,
          valor2: item.valor2 ?? null,
        })),
      };

      return new StatusResponse(true, 200, 'Multitabla encontrada', result);
    } catch (error) {
      return new StatusResponse(false, 500, 'Error al obtener multitabla', error);
    }
  }

  async create(
    dto: CreateUpdateMultitablaDto,
    usuario: string,
    ip: string,
  ): Promise<StatusResponse<any>> {
    const resultados: Multitabla[] = [];
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Insertar la cabecera (sin idMultitabla)
      const fechaRegistro = new Date();

      const cabecera = this.multitablaRepository.create({
        nombre: dto.nombre,
        valor: dto.valor,
        valor2: dto.valor2,
        idMultitabla: undefined,
        fechaRegistro: fechaRegistro,
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
            fechaRegistro: fechaRegistro,
            ipRegistro: ip,
          });
          const savedDetalle = await queryRunner.manager.save(detalle);
          resultados.push(savedDetalle);
        }
      }

      await queryRunner.commitTransaction();
      return new StatusResponse(
        true,
        201,
        'Multitabla creada exitosamente',
        savedCabecera,
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      return new StatusResponse(false, 500, 'Error al crear multitabla', error);
    } finally {
      await queryRunner.release();
    }
  }

  async update(
    dto: CreateUpdateMultitablaDto,
    usuario: string,
    ip: string,
  ): Promise<StatusResponse<any>> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const cabecera = await this.multitablaRepository.findOne({
        where: { id: dto.id, activo: true, eliminado: false },
      });

      if (!cabecera || cabecera.idMultitabla !== null) {
        return new StatusResponse(false, 404, 'Cabecera no encontrada', null);
      }
      const fechaModificacion = new Date(); 
      cabecera.nombre = dto.nombre?? null;
      cabecera.valor = dto.valor ?? null;
      cabecera.valor2 = dto.valor2 ?? null;
      cabecera.fechaModificacion = fechaModificacion;
      cabecera.usuarioModificacion = usuario;
      cabecera.ipModificacion = ip;

      const updatedCabecera = await queryRunner.manager.save(cabecera);

      // 1. Obtener los items actuales desde la BD
      const existingItems = await this.multitablaRepository.find({
        where: { idMultitabla: dto.id, activo: true, eliminado: false },
      });

      const existingItemMap = new Map<number, Multitabla>();
      existingItems.forEach((item) => existingItemMap.set(item.id, item));

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
              fechaModificacion: fechaModificacion,
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
              fechaRegistro: fechaModificacion,
              usuarioRegistro: usuario,
              ipRegistro: ip,
            });
            const savedItem = await queryRunner.manager.save(nuevoItem);
            nuevosItems.push(savedItem);
          }
        }
      }

      // 3. Eliminar los items que ya existían pero NO están en dto
      const idsRecibidos = dto.items?.map((i) => i.id).filter(Boolean) ?? [];
      const idsEliminar = existingItems
        .filter((item) => !idsRecibidos.includes(item.id))
        .map((item) => item.id);

      if (idsEliminar.length > 0) {
        for (const id of idsEliminar) {
          await queryRunner.manager.update(Multitabla, id, {
            activo: false,
            eliminado: true,
            usuarioEliminacion: usuario,
            ipEliminacion: ip,
            fechaEliminacion: fechaModificacion,
          });
        }
      }

      await queryRunner.commitTransaction();

      return new StatusResponse(
        true,
        200,
        'Multitabla actualizada correctamente',
        updatedCabecera,
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      return new StatusResponse(
        false,
        500,
        'Error al actualizar multitabla',
        error,
      );
    } finally {
      await queryRunner.release();
    }
  }

  async delete(
    id: number,
    usuarioEliminacion: string,
    ipEliminacion: string,
  ): Promise<StatusResponse<null>> {
    try {
      // Buscar la cabecera
      const multitabla = await this.multitablaRepository.findOne({
        where: { id, activo: true, eliminado: false },
      });
      if (!multitabla) {
        return new StatusResponse(false, 404, 'Multitabla no encontrada', null);
      }

      // Buscar los items relacionados
      const items = await this.multitablaRepository.find({
        where: { idMultitabla: id, activo: true, eliminado: false },
      });
      
      const fechaEliminacion = new Date();

      // Marcar cabecera como eliminada
      multitabla.usuarioEliminacion = usuarioEliminacion;
      multitabla.ipEliminacion = ipEliminacion;
      multitabla.activo = false;
      multitabla.eliminado = true;
      multitabla.fechaEliminacion = fechaEliminacion

      // Marcar items como eliminados

      const itemsAuditados = items.map((item) => {
        item.usuarioEliminacion = usuarioEliminacion;
        item.ipEliminacion = ipEliminacion;
        item.activo = false;
        item.eliminado = true;
        item.fechaEliminacion = fechaEliminacion;
        return item;
      });

      // Guardar cambios
      await this.multitablaRepository.save([multitabla, ...itemsAuditados]);

      return new StatusResponse(true, 200, 'Multitabla eliminada', null);
    } catch (error) {
      return new StatusResponse(
        false,
        500,
        'Error al eliminar multitabla',
        error,
      );
    }
  }

  async deleteMany(
    ids: number[],
    usuario: string,
    ip: string,
  ): Promise<StatusResponse<any>> {
    try {
      // Buscar cabeceras
      const multitablas = await this.multitablaRepository.findBy({
        id: In(ids),
        activo: true,
        eliminado: false,
      });

      if (!multitablas.length) {
        return new StatusResponse(
          false,
          404,
          'No se encontraron multitablas para eliminar',
          null,
        );
      }

      // Buscar items relacionados
      const items = await this.multitablaRepository.find({
        where: { idMultitabla: In(ids), activo: true, eliminado: false },
      });

      const fechaEliminacion = new Date();

      // Actualizar campos de auditoría antes de eliminar (cabeceras)
      const cabecerasAuditadas = multitablas.map((multitabla) => {
        multitabla.usuarioEliminacion = usuario;
        multitabla.ipEliminacion = ip;
        multitabla.activo = false;
        multitabla.eliminado = true;
        multitabla.fechaEliminacion = fechaEliminacion;
        return multitabla;
      });

      // Actualizar campos de auditoría antes de eliminar (items)
      const itemsAuditados = items.map((item) => {
        item.usuarioEliminacion = usuario;
        item.ipEliminacion = ip;
        item.activo = false;
        item.eliminado = true;
        item.fechaEliminacion = fechaEliminacion;
        return item;
      });

      // Guardar todos los cambios
      await this.multitablaRepository.save([...cabecerasAuditadas, ...itemsAuditados]);

      return new StatusResponse(true, 200, 'Multitablas eliminadas', null);
    } catch (error) {
      return new StatusResponse(
        false,
        500,
        'Error al eliminar múltiples multitablas',
        error,
      );
    }
  }
}
