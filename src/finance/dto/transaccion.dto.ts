import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  TipoTransaccion,
  TipoTransaccionOperativa,
} from '../enum/transaccion.enum';

const TIPOS_TRANSACCION_FILTRABLES = [TipoTransaccion.INGRESO, TipoTransaccion.EGRESO] as const;

export class CrearTransaccionBaseDto {
  @Type(() => Number)
  @IsInt()
  idCuenta!: number;

  @Type(() => Number)
  @IsInt()
  idCategoria!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  idSubcategoria?: number | null;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  monto!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(250)
  concepto!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  nota?: string | null;

  @IsOptional()
  @IsDateString()
  fecha?: string;
}

export class CrearEgresoDto extends CrearTransaccionBaseDto {}

export class CrearIngresoDto extends CrearTransaccionBaseDto {}

export class ActualizarTransaccionDto extends CrearTransaccionBaseDto {}

export class CrearTransferenciaDto {
  @Type(() => Number)
  @IsInt()
  idCuentaOrigen!: number;

  @Type(() => Number)
  @IsInt()
  idCuentaDestino!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  monto!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(250)
  concepto!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  nota?: string | null;

  @IsOptional()
  @IsDateString()
  fecha?: string;
}

export class CrearPagoTarjetaDto {
  @Type(() => Number)
  @IsInt()
  idCuentaOrigen!: number;

  @Type(() => Number)
  @IsInt()
  idTarjetaCredito!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  monto!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  nota?: string | null;

  @IsOptional()
  @IsDateString()
  fecha?: string;
}

export class FiltroTransaccionesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  idCuenta?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  idCategoria?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  monedaCodigo?: string;

  @IsOptional()
  @IsDateString()
  fechaDesde?: string;

  @IsOptional()
  @IsDateString()
  fechaHasta?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  montoMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  montoMax?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsIn(TIPOS_TRANSACCION_FILTRABLES)
  tipo?: TipoTransaccionOperativa;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
