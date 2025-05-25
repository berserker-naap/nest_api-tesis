import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsInt } from 'class-validator';

export class CreateUpdateOpcionDto {
  @IsInt()
  @IsOptional()
  idModulo?: number;

  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  path: string;

  @IsBoolean()
  @IsOptional()
  isVisibleNavegacion?: boolean = true;
}
