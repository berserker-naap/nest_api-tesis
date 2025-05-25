// src/permisos/dto/create-update-permiso.dto.ts
import { IsString, IsOptional, IsBoolean, IsNotEmpty, Length } from 'class-validator';

export class CreateUpdatePermisoDto {
  
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  nombre: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  descripcion?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsBoolean()
  eliminado?: boolean;

  @IsOptional()
  @IsString()
  @Length(0, 50)
  ipRegistro?: string;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  usuarioRegistro?: string;
}
