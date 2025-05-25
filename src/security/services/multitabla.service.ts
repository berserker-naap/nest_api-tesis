import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StatusResponseDto } from 'src/common/dto/response.dto';
import { Repository } from 'typeorm';
import { CreateMultitablaDto, UpdateMultitablaDto, UpsertMultitablaDto } from '../dto/multitabla.dto';
import { Multitabla } from '../entities/multitabla.entity';

@Injectable()
export class MultitablaService {
  constructor(
    @InjectRepository(Multitabla)
    private readonly multitablaRepo: Repository<Multitabla>,
  ) {}

  async create(dto: CreateMultitablaDto): Promise<StatusResponseDto<Multitabla>> {
    try {
      const entity = this.multitablaRepo.create(dto);
      const saved = await this.multitablaRepo.save(entity);
      return new StatusResponseDto(true, 201, 'Registro creado exitosamente', saved);
    } catch (error) {
      return new StatusResponseDto(false, 500, 'Error al crear registro', error);
    }
  }

  async update(dto: UpdateMultitablaDto): Promise<StatusResponseDto<any>> {
    try {
      const entity = await this.multitablaRepo.findOne({ where: { id: dto.id } });
      if (!entity) {
        return new StatusResponseDto(false, 404, 'Registro no encontrado', null);
      }
      Object.assign(entity, {
        ...dto,
        fechaModificacion: new Date(),
      });
      const updated = await this.multitablaRepo.save(entity);
      return new StatusResponseDto(true, 200, 'Registro actualizado', updated);
    } catch (error) {
      return new StatusResponseDto(false, 500, 'Error al actualizar registro', error);
    }
  }

  async eliminar(id: number, usuarioEliminacion: string, ipEliminacion?: string): Promise<StatusResponseDto<null>> {
    try {
      const found = await this.multitablaRepo.findOne({ where: { id } });
      if (!found) {
        return new StatusResponseDto(false, 404, 'Registro no encontrado', null);
      }
      await this.multitablaRepo.update(id, {
        eliminado: true,
        activo: false,
        usuarioEliminacion,
        ipEliminacion,
        fechaEliminacion: new Date(),
      });
      return new StatusResponseDto(true, 200, 'Registro eliminado (soft delete)', null);
    } catch (error) {
      return new StatusResponseDto(false, 500, 'Error al eliminar registro', error);
    }
  }

  async habilitar(id: number, activo: boolean): Promise<StatusResponseDto<null>> {
    try {
      const found = await this.multitablaRepo.findOne({ where: { id } });
      if (!found) {
        return new StatusResponseDto(false, 404, 'Registro no encontrado', null);
      }
      await this.multitablaRepo.update(id, { activo });
      return new StatusResponseDto(true, 200, `Registro ${activo ? 'habilitado' : 'deshabilitado'}`, null);
    } catch (error) {
      return new StatusResponseDto(false, 500, 'Error al actualizar estado', error);
    }
  }

  async upsertMany(array: UpsertMultitablaDto[]): Promise<StatusResponseDto<null>> {
    try {
      for (const item of array) {
        if (item.id) {
          const entity = await this.multitablaRepo.findOne({ where: { id: item.id } });
          if (entity) {
            Object.assign(entity, {
              ...item,
              fechaModificacion: new Date(),
            });
            await this.multitablaRepo.save(entity);
          }
        } else {
          const entity = this.multitablaRepo.create(item);
          await this.multitablaRepo.save(entity);
        }
      }
      return new StatusResponseDto(true, 200, 'Operación masiva completada', null);
    } catch (error) {
      return new StatusResponseDto(false, 500, 'Error en operación masiva', error);
    }
  }

  async findOne(id: number): Promise<StatusResponseDto<any>> {
    try {
      const item = await this.multitablaRepo.findOne({ where: { id } });
      if (!item) {
        return new StatusResponseDto(false, 404, 'Registro no encontrado', null);
      }
      return new StatusResponseDto(true, 200, 'Registro encontrado', item);
    } catch (error) {
      return new StatusResponseDto(false, 500, 'Error al obtener registro', error);
    }
  }
}
