import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StatusResponseDto } from 'src/common/dto/response.dto';
import { In, Repository } from 'typeorm';
import { Opcion } from '../entities/opcion.entity';
import { CreateUpdateOpcionDto } from '../dto/opcion.dto';
import { Modulo } from '../entities/modulo.entity';

@Injectable()
export class OpcionService {
  constructor(
    @InjectRepository(Modulo)
    private readonly moduloRepository: Repository<Modulo>,
    @InjectRepository(Opcion)
    private readonly opcionRepository: Repository<Opcion>,
  ) { }

  async findAll(): Promise<StatusResponseDto<any>> {
    try {
      const opciones = await this.opcionRepository.find({
        relations: ['modulo'],
      });
      return new StatusResponseDto(true, 200, 'Opciones obtenidas', opciones);
    } catch (error) {
      return new StatusResponseDto(
        false,
        500,
        'Error al obtener opciones',
        error,
      );
    }
  }

  async findOne(id: number): Promise<StatusResponseDto<any>> {
    try {
      const opcion = await this.opcionRepository.findOne({
        where: { id },
        relations: ['modulo'],
      });
      if (!opcion) {
        return new StatusResponseDto(false, 404, 'Opción no encontrada', null);
      }
      return new StatusResponseDto(true, 200, 'Opción encontrada', opcion);
    } catch (error) {
      return new StatusResponseDto(
        false,
        500,
        'Error al obtener opción',
        error,
      );
    }
  }
  async create(
    dto: CreateUpdateOpcionDto,
    usuario: string,
    ip: string
  ): Promise<StatusResponseDto<any>> {
    try {
      const modulo = await this.moduloRepository.findOne({ where: { id: dto.idModulo } });

      if (!modulo) {
        return new StatusResponseDto(false, 404, 'Módulo no encontrado', null);
      }

      const opcion = this.opcionRepository.create({
        ...dto,
        modulo,
        usuarioRegistro: usuario,
        ipRegistro: ip,
      });

      const saved = await this.opcionRepository.save(opcion);

      return new StatusResponseDto(true, 201, 'Opción creada', saved);
    } catch (error) {
      return new StatusResponseDto(false, 500, 'Error al crear opción', error);
    }
  }

  async update(
    id: number,
    dto: CreateUpdateOpcionDto,
    usuario: string,
    ip: string,
  ): Promise<StatusResponseDto<any>> {
    try {
      const opcion = await this.opcionRepository.findOne({
        where: { id },
        relations: ['modulo'],
      });

      if (!opcion) {
        return new StatusResponseDto(false, 404, 'Opción no encontrada', null);
      }

      const modulo = await this.moduloRepository.findOne({ where: { id: dto.idModulo } });

      if (!modulo) {
        return new StatusResponseDto(false, 404, 'Módulo no encontrado', null);
      }

      const actualizado = this.opcionRepository.create({
        ...opcion,
        ...dto,
        modulo,
        usuarioModificacion: usuario,
        ipModificacion: ip,
        fechaModificacion: new Date(),
      });

      const saved = await this.opcionRepository.save(actualizado);

      return new StatusResponseDto(true, 200, 'Opción actualizada', saved);
    } catch (error) {
      return new StatusResponseDto(false, 500, 'Error al actualizar opción', error);
    }
  }
  async delete(
    id: number,
    usuario: string,
    ip: string,
  ): Promise<StatusResponseDto<any>> {
    try {
      const opcion = await this.opcionRepository.findOne({
        where: { id },
        relations: ['modulo'],
      });
      if (!opcion) {
        return new StatusResponseDto(false, 404, 'Opción no encontrada', null);
      }

      opcion.usuarioEliminacion = usuario;
      opcion.ipEliminacion = ip;
      opcion.fechaEliminacion = new Date();

      await this.opcionRepository.save(opcion);
      await this.opcionRepository.remove(opcion);

      return new StatusResponseDto(true, 200, 'Opción eliminada', opcion);
    } catch (error) {
      return new StatusResponseDto(
        false,
        500,
        'Error al eliminar opción',
        error,
      );
    }
  }

  async deleteMany(
    ids: number[],
    usuario: string,
    ip: string,
  ): Promise<StatusResponseDto<any>> {
    try {
      const opciones = await this.opcionRepository.findBy({ id: In(ids) });

      if (!opciones.length) {
        return new StatusResponseDto(
          false,
          404,
          'No se encontraron opciones para eliminar',
          null,
        );
      }

      const auditadas = opciones.map((opcion) => {
        opcion.usuarioEliminacion = usuario;
        opcion.ipEliminacion = ip;
        opcion.fechaEliminacion = new Date();
        return opcion;
      });

      await this.opcionRepository.save(auditadas);
      await this.opcionRepository.remove(auditadas);

      return new StatusResponseDto(true, 200, 'Opciones eliminadas', ids);
    } catch (error) {
      return new StatusResponseDto(
        false,
        500,
        'Error al eliminar múltiples opciones',
        error,
      );
    }
  }
}
