import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsInt } from 'class-validator';
import { IsNullable } from 'src/common/decorators/is-nullable.decorator';

export class CreateOpcionDto {
  @IsInt()
  @IsNotEmpty()
  idModulo!: number;

  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsString()
  @IsNullable()
  path!: string | null;

  @IsBoolean()
  isVisibleNavegacion: boolean = true;
}

export class UpdateOpcionDto {
  @IsInt()
  @IsNotEmpty()
  idModulo!: number;

  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsString()
  @IsNullable()
  path!: string | null;

  @IsBoolean()
  isVisibleNavegacion: boolean = true;
}

export class OpcionResponseDto {
  @IsInt()
  id!: number;

  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsString()
  @IsNullable()
  path!: string | null;

  @IsBoolean()
  isVisibleNavegacion!: boolean;

  modulo!: {
    id: number;
    nombre: string;
  };
}
