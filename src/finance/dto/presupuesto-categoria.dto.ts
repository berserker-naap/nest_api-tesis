import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';

export class GuardarPresupuestoCategoriaDto {
  @Type(() => Number)
  @IsInt()
  idCategoria!: number;

  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  periodo!: string;

  @IsString()
  @Matches(/^[A-Za-z]{3,10}$/)
  monedaCodigo!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  montoLimite!: number;
}

export class ListarPresupuestosQueryDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  periodo?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z]{3,10}$/)
  monedaCodigo?: string;
}
