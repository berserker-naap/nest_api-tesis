import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

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
