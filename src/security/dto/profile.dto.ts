import { Type } from 'class-transformer';
import { IsDate, IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { IsNullable } from 'src/common/decorators/is-nullable.decorator';
import { ProfileValidationStatus } from '../enums/profile-validation-status.enum';

export class UpdateProfileCredentialsDto {
  @IsString()
  @IsNotEmpty()
  login!: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(50)
  @Matches(/(?:(?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'La contraseña debe tener una letra mayúscula, una letra minúscula y un número',
  })
  password?: string;
}

export class UpdateProfileDataDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre!: string;

  @IsNullable()
  @IsString()
  @MaxLength(100)
  apellido!: string | null;

  @IsInt()
  idTipoDocumentoIdentidad!: number;

  @IsNullable()
  @IsString()
  @MaxLength(50)
  documentoIdentidad!: string | null;

  @IsNullable()
  @IsDateString()
  fechaNacimiento!: string | null;
}

export class ProfileTipoDocumentoResponseDto {
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsNullable()
  @IsString()
  valor!: string | null;
}

export class ProfileMeResponseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre!: string;

  @IsNullable()
  @IsString()
  @MaxLength(100)
  apellido!: string | null;

  @IsNullable()
  @IsString()
  @MaxLength(50)
  documentoIdentidad!: string | null;

  @IsNullable()
  @Type(() => Date)
  @IsDate()
  fechaNacimiento!: Date | null;

  @IsNullable()
  tipoDocumento!: ProfileTipoDocumentoResponseDto | null;

  @IsString()
  @IsNotEmpty()
  validacionEstado!: ProfileValidationStatus;
}
