import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { PersonaDto } from './persona.dto';

export class CreateUpdateUsuarioDto {
  @IsString()
  @IsNotEmpty()
  login: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsNotEmpty()
  idPersona: number; // Asumimos que recibirás solo el ID de persona

  // Opcionales
  @IsOptional()
  usuarioRegistro?: string;
}

export class CreateUsuarioDto {
  @IsString() @IsNotEmpty()
  login: string;

  @IsString() @IsNotEmpty()
  password: string;

  @IsOptional()
  idPersona?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => PersonaDto)
  persona?: PersonaDto;

  @IsArray()
  roles: number[];
}

export class AsignarUsuarioRolesDto {
  @IsArray()
  roles: number[];
}

export class CreateUsuarioWithPersonaDto {
  // Datos de la Persona
  nombre: string;
  apellido?: string;
  idTipoDocumentoIdentidad?: number;
  documentoIdentidad?: string;
  fechaNacimiento?: Date;

  // Datos del Usuario
  login: string;
  password: string;
  usuarioRegistro: string;
}
