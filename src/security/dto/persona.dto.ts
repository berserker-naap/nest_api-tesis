import { IsString, IsNotEmpty, IsInt, IsDate } from 'class-validator';
import { IsNullable } from 'src/common/decorators/is-nullable.decorator';

export class CreatePersonaDto {
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsNullable()
  @IsString()
  apellido!: string | null;

  @IsInt()
  idTipoDocumentoIdentidad!: number;

  @IsNullable()
  @IsString()
  documentoIdentidad!: string | null;

  @IsNullable()
  @IsDate()
  fechaNacimiento!: Date | null;
}

export class UpdatePersonaDto {
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsNullable()
  @IsString()
  apellido!: string | null;

  @IsInt()
  idTipoDocumentoIdentidad!: number;

  @IsNullable()
  @IsString()
  documentoIdentidad!: string | null;

  @IsNullable()
  @IsDate()
  fechaNacimiento!: Date | null;
}

export class TipoDocumentoResponseDto {
  @IsInt()
  id!: number;

  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsNullable()
  @IsString()
  valor!: string | null;
}

export class PersonaResponseDto {
  @IsInt()
  id!: number;

  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsNullable()
  @IsString()
  apellido!: string | null;

  @IsNullable()
  @IsString()
  documentoIdentidad!: string | null;

  @IsNullable()
  @IsDate()
  fechaNacimiento!: Date | null;

  @IsNullable()
  tipoDocumento!: TipoDocumentoResponseDto | null;
}
