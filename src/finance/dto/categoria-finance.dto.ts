import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional } from 'class-validator';
import { TipoCategoriaFinance } from '../enum/categoria-finance.enum';

const TIPOS_CATEGORIA = [TipoCategoriaFinance.INGRESO, TipoCategoriaFinance.EGRESO] as const;

export class FiltroCategoriasDto {
  @IsOptional()
  @IsIn(TIPOS_CATEGORIA)
  tipo?: TipoCategoriaFinance;
}

export class CategoriaFinanceResponseDto {
  id!: number;
  tipo!: TipoCategoriaFinance;
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
