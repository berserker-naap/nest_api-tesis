import { IsString, IsNotEmpty, IsOptional } from "class-validator";

export class PersonaDto {
  @IsString() @IsNotEmpty()
  nombre: string;

  @IsOptional()
  apellido?: string;

  @IsOptional()
  idTipoDocumentoIdentidad?: number;

  @IsOptional()
  documentoIdentidad?: string;

  @IsOptional()
  fechaNacimiento?: Date;
}
