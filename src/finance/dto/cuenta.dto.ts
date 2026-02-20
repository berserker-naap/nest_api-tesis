import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  Min,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { TipoEntidadFinanciera } from '../enum/entidad-financiera.enum';
import { NaturalezaTipoCuenta } from '../enum/tipo-cuenta.enum';

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
  @Min(0)
  @Type(() => Number)
  saldoInicial!: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  descripcionApertura?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  lineaCredito?: number | null;
}

export class CuentaResponseDto {
  id!: number;
  alias!: string;
  saldoActual!: number;
  lineaCredito!: number | null;
  esTarjetaCredito!: boolean;
  moneda!: {
    id: number;
    codigo: string;
    nombre: string;
    simbolo: string;
  };
  tipoCuenta!: {
    id: number;
    nombre: string;
    naturaleza: NaturalezaTipoCuenta;
  };
  entidadFinanciera!: {
    id: number;
    nombre: string;
    tipo: TipoEntidadFinanciera;
    iconoUrl: string | null;
  } | null;
}
