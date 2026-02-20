import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StatusResponse } from 'src/common/dto/response.dto';
import { Repository } from 'typeorm';
import { TipoCuenta } from '../entities/tipo-cuenta.entity';

@Injectable()
export class TipoCuentaService {
  constructor(
    @InjectRepository(TipoCuenta)
    private readonly tipoCuentaRepository: Repository<TipoCuenta>,
  ) {}

  async findAll(): Promise<StatusResponse<any>> {
    try {
      const tiposCuenta = await this.tipoCuentaRepository.find({
        where: { activo: true, eliminado: false },
      });
      return new StatusResponse(true, 200, 'Tipos de cuenta obtenidos', tiposCuenta);
    } catch (error) {
      return new StatusResponse(
        false,
        500,
        'Error al obtener tipos de cuenta',
        error,
      );
    }
  }
}
