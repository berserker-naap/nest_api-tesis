import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CatalogoMonedaResponseDto {
  id!: number;
  codigo!: string;
  nombre!: string;
  simbolo!: string;
}

export class CatalogoTipoCuentaResponseDto {
  id!: number;
  nombre!: string;
  naturaleza!: 'ACTIVO' | 'PASIVO';
}

export class CatalogoEntidadFinancieraResponseDto {
  id!: number;
  nombre!: string;
  tipo!: 'BANCO' | 'CAJA' | 'BILLETERA';
  iconoUrl!: string | null;
}

export class FiltroCatalogoDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  tipoEntidad?: 'BANCO' | 'CAJA' | 'BILLETERA';

  @IsOptional()
  @IsInt()
  idMoneda?: number;
}
