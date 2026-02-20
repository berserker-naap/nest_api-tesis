import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StatusResponse } from 'src/common/dto/response.dto';
import { Repository } from 'typeorm';
import { EntidadFinanciera } from '../entities/entidad-financiera.entity';

@Injectable()
export class EntidadFinancieraService {
  constructor(
    @InjectRepository(EntidadFinanciera)
    private readonly entidadFinancieraRepository: Repository<EntidadFinanciera>,
  ) {}

  async findAll(): Promise<StatusResponse<any>> {
    try {
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
