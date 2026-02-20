import { Type } from 'class-transformer';
import {
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
  @Type(() => Date)
  fecha?: Date;
}

export class CrearEgresoDto extends CrearTransaccionBaseDto {}

export class CrearIngresoDto extends CrearTransaccionBaseDto {}

export class FiltroTransaccionesDto {
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
