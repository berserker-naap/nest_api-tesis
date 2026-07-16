import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CrearMetaAhorroDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  descripcion?: string | null;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  montoObjetivo!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  montoInicial?: number;

  @IsDateString()
  fechaObjetivo!: string;

  @IsString()
  @Matches(/^[A-Za-z]{3,10}$/)
  monedaCodigo!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  idCuenta?: number | null;
}

export class AbonarMetaAhorroDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  monto!: number;
}

export class CrearPagoRecurrenteDto {
  @Type(() => Number)
  @IsInt()
  idCuenta!: number;

  @Type(() => Number)
  @IsInt()
  idCategoria!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  concepto!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  monto!: number;

  @IsString()
  @IsIn(['SEMANAL', 'MENSUAL', 'ANUAL'])
  frecuencia!: 'SEMANAL' | 'MENSUAL' | 'ANUAL';

  @IsDateString()
  proximaFecha!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(30)
  diasRecordatorio!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  nota?: string | null;
}

export class PeriodoMonedaQueryDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  periodo?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z]{3,10}$/)
  monedaCodigo?: string;
}
