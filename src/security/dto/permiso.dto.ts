import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsString, ValidateNested } from 'class-validator';

export class PermisoAccionResponseDto {
  @IsNumber()
  id!: number;

  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsBoolean()
  isAsignado!: boolean;
}

export class PermisoOpcionResponseDto {
  @IsNumber()
  id!: number;

  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @ValidateNested({ each: true })
  @IsArray()
  @Type(() => PermisoAccionResponseDto)
  acciones!: PermisoAccionResponseDto[] | [];
}

export class PermisoModuloResponseDto {
  @IsNumber()
  id!: number;

  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @ValidateNested({ each: true })
  @IsArray()
  @Type(() => PermisoOpcionResponseDto)
  opciones!: PermisoOpcionResponseDto[] | [];
}

export class PermisoBulkDto {
  @IsNumber()
  idRol!: number;

  @IsNumber()
  idOpcion!: number;

  @IsNumber()
  idAccion!: number;

  @IsBoolean()
  isAsignado!: boolean;
}
