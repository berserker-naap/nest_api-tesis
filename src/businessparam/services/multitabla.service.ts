import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StatusResponse } from 'src/common/dto/response.dto';
import { DataSource, Repository, IsNull, In } from 'typeorm';
import { Multitabla } from '../entities/multitabla.entity';
import {
  CreateMultitablaDto,
  UpdateMultitablaDto,
  MultitablaResponseDto,
  MultitablaItemResponseDto,
} from '../dto/multitabla.dto';

@Injectable()
export class MultitablaService {
  constructor(
    @InjectRepository(Multitabla)
    private readonly multitablaRepository: Repository<Multitabla>,
    private readonly dataSource: DataSource,
  ) { }

  async findAll(): Promise<StatusResponse<MultitablaResponseDto[] | any>> {
    try {
      const cabeceras = await this.multitablaRepository.find({
        select: { id: true, nombre: true, valor: true, valor2: true },
        where: {
          idMultitabla: IsNull(),
          activo: true,
          eliminado: false,
        },
        order: { nombre: 'ASC' },
      });
      const cabecerasDto: MultitablaResponseDto[] = cabeceras.map((cabecera) => ({
        id: cabecera.id,
        nombre: cabecera.nombre,
        valor: cabecera.valor ?? null,
        valor2: cabecera.valor2 ?? null,
        items: [], // Inicializamos vacío, al listado no le interesa mostrar el resto
      }));

      return new StatusResponse(true, 200, 'Multitablas obtenidas', cabecerasDto);
    } catch (error) {
      return new StatusResponse(
        false,
        500,
        'Error al obtener multitablas',
        error,
      );
    }
  }

  async findOne(id: number): Promise<StatusResponse<MultitablaResponseDto | any>> {
    try {
      // 1. Obtener cabecera
      const cabecera = await this.multitablaRepository.findOne({
        select: { id: true, nombre: true, valor: true, valor2: true },
        where: {
          id,
          idMultitabla: IsNull(),
          activo: true,
          eliminado: false,
        },
      });

      if (!cabecera) {
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
      const result: MultitablaResponseDto = {
        id: cabecera.id,
        nombre: cabecera.nombre,
        valor: cabecera.valor ?? null,
        valor2: cabecera.valor2 ?? null,
        items: items.map((item) => ({
          id: item.id,
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
    dto: CreateMultitablaDto,
    usuario: string,
    ip: string,
  ): Promise<StatusResponse<MultitablaResponseDto | any>> {

    const fechaRegistro = new Date();
    const savedItems: Multitabla[] = [];

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Insertar la cabecera (sin idMultitabla)
      const cabecera = this.multitablaRepository.create({
        nombre: dto.nombre,
        valor: dto.valor ?? null,
        valor2: dto.valor2 ?? null,
        idMultitabla: null,
        fechaRegistro: fechaRegistro,
        usuarioRegistro: usuario,
        ipRegistro: ip,
      });

      const savedCabecera = await queryRunner.manager.save(cabecera);

      // 2. Insertar sus items con idMultitabla = cabecera.id
      if (dto.items?.length) {
        for (const item of dto.items) {
          const detalle = this.multitablaRepository.create({
            idMultitabla: savedCabecera.id,
            nombre: item.nombre,
            valor: item.valor ?? null,
            valor2: item.valor2 ?? null,
            usuarioRegistro: usuario,
            fechaRegistro: fechaRegistro,
            ipRegistro: ip,
          });

          const savedDetalle = await queryRunner.manager.save(detalle);
          savedItems.push(savedDetalle);
        }
      }

      await queryRunner.commitTransaction();

      const response: MultitablaResponseDto = {
        id: savedCabecera.id,
        nombre: savedCabecera.nombre,
        valor: savedCabecera.valor ?? null,
        valor2: savedCabecera.valor2 ?? null,
        items: savedItems.map((item) => ({
          id: item.id,
          nombre: item.nombre,
          valor: item.valor ?? null,
          valor2: item.valor2 ?? null,
        })),
      };

      return new StatusResponse(
        true,
        201,
        'Multitabla creada exitosamente',
        response,
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      return new StatusResponse(false, 500, 'Error al crear multitabla', error);
    } finally {
      await queryRunner.release();
    }
  }

  async update(
    id: number,
    dto: UpdateMultitablaDto,
    usuario: string,
    ip: string,
  ): Promise<StatusResponse<MultitablaResponseDto | any>> {

    const fechaModificacion = new Date(); 
    const updatedItems: Multitabla[] = [];

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const cabecera = await this.multitablaRepository.findOne({
        where: { 
          id: id,
          idMultitabla: IsNull(), 
          activo: true, 
          eliminado: false, 
          },
      });

      if (!cabecera) {
        return new StatusResponse(false, 404, 'Cabecera no encontrada', null);
      }
   
      cabecera.nombre = dto.nombre;
      cabecera.valor = dto.valor ?? null;
      cabecera.valor2 = dto.valor2 ?? null;
      cabecera.fechaModificacion = fechaModificacion;
      cabecera.usuarioModificacion = usuario;
      cabecera.ipModificacion = ip;

      const updatedCabecera = await queryRunner.manager.save(cabecera);


      // 1. Obtener los items actuales desde la BD
      const items = await this.multitablaRepository.find({
        where: { idMultitabla: id, activo: true, eliminado: false },
      });

      const itemsMap = new Map<number, Multitabla>();
      items.forEach((item) => itemsMap.set(item.id, item));

      // 2. Procesar todos los items del dto
      if (dto.items?.length) {
        for (const itemDto of dto.items) {
          const idItem = itemDto.id;

          if (idItem && itemsMap.has(idItem)) {
            // UPDATE: actualizar y remover del Map
            const itemExistente: Multitabla = itemsMap.get(idItem)!;
            Object.assign(itemExistente, {
              nombre: itemDto.nombre,
              valor: itemDto.valor ?? null,
              valor2: itemDto.valor2 ?? null,
              fechaModificacion: fechaModificacion,
              usuarioModificacion: usuario,
              ipModificacion: ip,
            });
            const updatedItem = await queryRunner.manager.save(itemExistente);
            updatedItems.push(updatedItem);
            itemsMap.delete(idItem); // Remover porque ya fue procesado

          } else {
            // INSERT: crear nuevo item
            const nuevoItem = this.multitablaRepository.create({
              nombre: itemDto.nombre,
              valor: itemDto.valor ?? null,
              valor2: itemDto.valor2 ?? null,
              idMultitabla: id,
              fechaRegistro: fechaModificacion,
              usuarioRegistro: usuario,
              ipRegistro: ip,
            });
            const savedItem = await queryRunner.manager.save(nuevoItem);
            updatedItems.push(savedItem);
          }
        }
      }

      // 3. Eliminar items que quedaron en el Map (no vinieron en el DTO = el frontend los eliminó)
      if (itemsMap.size > 0) {
        for (const [idItem, item] of itemsMap) {
          item.activo = false;
          item.eliminado = true;
          item.usuarioEliminacion = usuario;
          item.ipEliminacion = ip;
          item.fechaEliminacion = fechaModificacion;
          await queryRunner.manager.save(item);
        }
      }

      await queryRunner.commitTransaction();

      const itemsResponse: MultitablaItemResponseDto[] = updatedItems.map(
        (item) => ({
          id: item.id,
          nombre: item.nombre,
          valor: item.valor ?? null,
          valor2: item.valor2 ?? null,
        }),
      );

      const response: MultitablaResponseDto = {
        id: updatedCabecera.id,
        nombre: updatedCabecera.nombre,
        valor: updatedCabecera.valor ?? null,
        valor2: updatedCabecera.valor2 ?? null,
        items: itemsResponse,
      };

      return new StatusResponse(
        true,
        200,
        'Multitabla actualizada correctamente',
        response,
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
  ): Promise<StatusResponse<any>> {
    try {
      const fechaEliminacion = new Date();

      // Buscar la cabecera
      const multitabla = await this.multitablaRepository.findOne({
        where: { id, activo: true, eliminado: false , idMultitabla: IsNull() },
      });
      if (!multitabla) {
        return new StatusResponse(false, 404, 'Multitabla no encontrada', null);
      }

      // Buscar los items relacionados
      const items = await this.multitablaRepository.find({
        where: { idMultitabla: id, activo: true, eliminado: false },
      });
      
  
      // Marcar cabecera como eliminada
      multitabla.usuarioEliminacion = usuarioEliminacion;
      multitabla.ipEliminacion = ipEliminacion;
      multitabla.activo = false;
      multitabla.eliminado = true;
      multitabla.fechaEliminacion = fechaEliminacion;

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
      return new StatusResponse(false, 500, 'Error al obtener multitabla', error);
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
        idMultitabla: IsNull(),
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
