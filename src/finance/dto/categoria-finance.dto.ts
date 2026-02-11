import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional } from 'class-validator';

export class FiltroCategoriasDto {
  @IsOptional()
  @IsIn(['INGRESO', 'EGRESO'])
  tipo?: 'INGRESO' | 'EGRESO';
}

export class CategoriaFinanceResponseDto {
  id!: number;
  tipo!: 'INGRESO' | 'EGRESO';
  nombre!: string;
  icono!: string | null;
  colorHex!: string | null;
  orden!: number | null;
}

export class SubcategoriaFinanceResponseDto {
  id!: number;
  nombre!: string;
  orden!: number | null;
}

export class ParamIdDto {
  @Type(() => Number)
  @IsInt()
  id!: number;
}
