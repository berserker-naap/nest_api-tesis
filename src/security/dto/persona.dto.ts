import { IsString, IsNotEmpty, IsOptional } from "class-validator";

export class CreateUpdatePersonaDto {
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
