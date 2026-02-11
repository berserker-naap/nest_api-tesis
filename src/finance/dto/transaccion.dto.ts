import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

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
  comprobanteUrl?: string | null;

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
