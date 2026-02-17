import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsInt, IsDate } from 'class-validator';
import { IsNullable } from 'src/common/decorators/is-nullable.decorator';

export class CreateProfileDto {
  @IsString()
  @IsNotEmpty()
  nombres!: string;

  @IsNullable()
  @IsString()
  apellidos!: string | null;

  @IsInt()
  idTipoDocumentoIdentidad!: number;

  @IsNullable()
  @IsString()
  documentoIdentidad!: string | null;

  @IsNullable()
  @Type(() => Date)
  @IsDate()
  fechaNacimiento!: Date | null;
}

export class UpdateProfileDto {
  @IsString()
  @IsNotEmpty()
  nombres!: string;

  @IsNullable()
  @IsString()
  apellidos!: string | null;

  @IsInt()
  idTipoDocumentoIdentidad!: number;

  @IsNullable()
  @IsString()
  documentoIdentidad!: string | null;

  @IsNullable()
  @Type(() => Date)
  @IsDate()
  fechaNacimiento!: Date | null;
}

export class ProfileTipoDocumentoResponseDto {
  @IsInt()
  id!: number;

  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsNullable()
  @IsString()
  valor!: string | null;
}

export class ProfileResponseDto {
  @IsInt()
  id!: number;

  @IsString()
  @IsNotEmpty()
  nombres!: string;

  @IsNullable()
  @IsString()
  apellidos!: string | null;

  @IsNullable()
  @IsString()
  documentoIdentidad!: string | null;

  @IsNullable()
  @Type(() => Date)
  @IsDate()
  fechaNacimiento!: Date | null;

  @IsNullable()
  tipoDocumento!: ProfileTipoDocumentoResponseDto | null;
}
