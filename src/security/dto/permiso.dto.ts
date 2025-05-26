// src/permisos/dto/create-update-permiso.dto.ts
import { IsString, IsOptional, IsBoolean, IsNotEmpty, Length, IsNumber } from 'class-validator';

export class CreatePermisoDto {
  @IsNotEmpty()
  @IsNumber()
  idRol: number;

  @IsNotEmpty()
  @IsNumber()
  idOpcion: number;

  @IsNotEmpty()
  @IsNumber()
  idAccion: number;
}



export class PermisoBulkDto {
  @IsNumber()
  idRol: number;

  @IsNumber()
  idOpcion: number;

  @IsNumber()
  idAccion: number;

  @IsBoolean()
  asignado: boolean;
}
