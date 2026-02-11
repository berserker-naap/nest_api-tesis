import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CrearCuentaDto {
  @IsInt()
  @Type(() => Number)
  idMoneda!: number;

  @IsInt()
  @Type(() => Number)
  idTipoCuenta!: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  idEntidadFinanciera?: number | null;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  alias!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  saldoInicial!: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  descripcionApertura?: string;
}

export class CuentaResponseDto {
  id!: number;
  alias!: string;
  saldoActual!: number;
  moneda!: {
    id: number;
    codigo: string;
    nombre: string;
    simbolo: string;
  };
  tipoCuenta!: {
    id: number;
    nombre: string;
    naturaleza: 'ACTIVO' | 'PASIVO';
  };
  entidadFinanciera!: {
    id: number;
    nombre: string;
    tipo: 'BANCO' | 'CAJA' | 'BILLETERA';
    iconoUrl: string | null;
  } | null;
}
