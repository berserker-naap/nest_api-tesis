import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StatusResponse } from 'src/common/dto/response.dto';
import { Repository } from 'typeorm';
import { Moneda } from '../entities/moneda.entity';

@Injectable()
export class MonedaService {
  constructor(
    @InjectRepository(Moneda)
    private readonly monedaRepository: Repository<Moneda>,
  ) {}

  async findAll(): Promise<StatusResponse<any>> {
    try {
      const monedas = await this.monedaRepository.find({
        where: { activo: true, eliminado: false },
      });
      return new StatusResponse(true, 200, 'Monedas obtenidas', monedas);
    } catch (error) {
      return new StatusResponse(false, 500, 'Error al obtener monedas', error);
    }
  }
}
