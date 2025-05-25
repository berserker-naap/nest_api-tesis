import { IsOptional, IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class CreateMultitablaDto {
  @IsOptional()
  @IsNumber()
  idTabla?: number;

  @IsOptional()
  @IsString()
  codigo?: string;

  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsOptional()
  @IsString()
  valor?: string;

  @IsOptional()
  @IsString()
  valor2?: string;

  @IsString()
  @IsNotEmpty()
  usuarioRegistro: string;

  @IsOptional()
  @IsString()
  ipRegistro?: string;
}

export class UpdateMultitablaDto {
  @IsNumber()
  id: number;

  @IsOptional()
  @IsNumber()
  idTabla?: number;

  @IsOptional()
  @IsString()
  codigo?: string;

  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  valor?: string;

  @IsOptional()
  @IsString()
  valor2?: string;

  @IsString()
  usuarioModificacion: string;

  @IsOptional()
  @IsString()
  ipModificacion?: string;
}

export class UpsertMultitablaDto {
  @IsOptional()
  @IsNumber()
  id?: number;

  @IsOptional()
  @IsNumber()
  idTabla?: number;

  @IsString()
  nombre: string;

  @IsOptional()
  @IsString()
  codigo?: string;

  @IsOptional()
  @IsString()
  valor?: string;

  @IsOptional()
  @IsString()
  valor2?: string;

  @IsOptional()
  @IsString()
  usuarioModificacion?: string;

  @IsOptional()
  @IsString()
  usuarioRegistro?: string;

  @IsOptional()
  @IsString()
  ipRegistro?: string;

  @IsOptional()
  @IsString()
  ipModificacion?: string;
}
