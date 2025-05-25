import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { StatusResponseDto } from "src/common/dto/response.dto";
import { In, Repository } from "typeorm";
import { Opcion } from "../entities/opcion.entity";
import { CreateUpdateOpcionDto } from "../dto/opcion.dto";

@Injectable()
export class OpcionService {
  constructor(
    @InjectRepository(Opcion)
    private readonly opcionRepository: Repository<Opcion>
  ) {}

  async findAll(): Promise<StatusResponseDto<any>> {
    try {
      const opciones = await this.opcionRepository.find({ relations: ['modulo'] });
      return new StatusResponseDto(true, 200, 'Opciones obtenidas', opciones);
    } catch (error) {
      return new StatusResponseDto(false, 500, 'Error al obtener opciones', error);
    }
  }

  async findOne(id: number): Promise<StatusResponseDto<any>> {
    try {
      const opcion = await this.opcionRepository.findOne({ where: { id }, relations: ['modulo'] });
      if (!opcion) {
        return new StatusResponseDto(false, 404, 'Opción no encontrada', null);
      }
      return new StatusResponseDto(true, 200, 'Opción encontrada', opcion);
    } catch (error) {
      return new StatusResponseDto(false, 500, 'Error al obtener opción', error);
    }
  }

  async create(dto: CreateUpdateOpcionDto): Promise<StatusResponseDto<any>> {
    try {
      const opcion = this.opcionRepository.create(dto);
      await this.opcionRepository.save(opcion);
      return new StatusResponseDto(true, 200, 'Opción creada', opcion);
    } catch (error) {
      return new StatusResponseDto(false, 500, 'Error al crear opción', error);
    }
  }

  async update(id: number, dto: CreateUpdateOpcionDto): Promise<StatusResponseDto<any>> {
    try {
      const opcion = await this.opcionRepository.findOne({ where: { id } });
      if (!opcion) {
        return new StatusResponseDto(false, 404, 'Opción no encontrada', null);
      }
      await this.opcionRepository.update(id, dto);
      const updated = await this.opcionRepository.findOne({ where: { id } });
      return new StatusResponseDto(true, 200, 'Opción actualizada', updated);
    } catch (error) {
      return new StatusResponseDto(false, 500, 'Error al actualizar opción', error);
    }
  }

  async delete(id: number): Promise<StatusResponseDto<any>> {
    try {
      const opcion = await this.opcionRepository.findOne({ where: { id } });
      if (!opcion) {
        return new StatusResponseDto(false, 404, 'Opción no encontrada', null);
      }
      await this.opcionRepository.remove(opcion);
      return new StatusResponseDto(true, 200, 'Opción eliminada', opcion);
    } catch (error) {
      return new StatusResponseDto(false, 500, 'Error al eliminar opción', error);
    }
  }

  async deleteMany(ids: number[]): Promise<StatusResponseDto<any>> {
    try {
      await this.opcionRepository.delete({ id: In(ids) });
      return new StatusResponseDto(true, 200, 'Opciones eliminadas', ids);
    } catch (error) {
      return new StatusResponseDto(false, 500, 'Error al eliminar múltiples opciones', error);
    }
  }
}
