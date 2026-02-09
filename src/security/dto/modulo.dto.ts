import { IsNotEmpty, IsString, IsInt } from 'class-validator';

export class CreateModuloDto {
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsString()
  @IsNotEmpty()
  icono!: string;
}

export class UpdateModuloDto {
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsString()
  @IsNotEmpty()
  icono!: string;
}

export class ModuloResponseDto {
  @IsInt()
  id!: number;

  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsString()
  @IsNotEmpty()
  icono!: string;
}
