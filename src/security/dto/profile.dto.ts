import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { IsNullable } from 'src/common/decorators/is-nullable.decorator';
import { ProfilePhoneStatus } from '../enums/profile-phone-status.enum';
import { ProfileValidationStatus } from '../enums/profile-validation-status.enum';

export class ProfilePhoneMeResponseDto {
  @IsInt()
  id!: number;

  @IsString()
  @IsNotEmpty()
  countryCode!: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber!: string;

  @IsString()
  @IsNotEmpty()
  internationalPhoneNumber!: string;

  @IsNullable()
  @IsString()
  alias!: string | null;

  @IsString()
  @IsNotEmpty()
  @IsEnum(ProfilePhoneStatus)
  status!: ProfilePhoneStatus;

  @IsNullable()
  @Type(() => Date)
  @IsDate()
  fechaVerificacion!: Date | null;
}

export class UpdateProfileDataDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombres!: string;

  @IsNullable()
  @IsString()
  @MaxLength(100)
  apellidos!: string | null;

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
  @IsInt()
  id!: number;

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
  nombres!: string;

  @IsNullable()
  @IsString()
  @MaxLength(100)
  apellidos!: string | null;

  @IsNullable()
  @IsString()
  @MaxLength(50)
  documentoIdentidad!: string | null;

  @IsNullable()
  @IsString()
  @MaxLength(500)
  fotoPerfilUrl!: string | null;

  @IsNullable()
  @IsString()
  @MaxLength(255)
  nombreFotoPerfil!: string | null;

  @IsNullable()
  @Type(() => Date)
  @IsDate()
  fechaCargaFotoPerfil!: Date | null;

  @IsNullable()
  @IsDateString()
  fechaNacimiento!: string | null;

  @IsNullable()
  tipoDocumento!: ProfileTipoDocumentoResponseDto | null;

  @IsString()
  @IsNotEmpty()
  status!: ProfileValidationStatus;

  @ValidateNested({ each: true })
  @IsArray()
  @Type(() => ProfilePhoneMeResponseDto)
  profilePhones?: ProfilePhoneMeResponseDto[] | [];
}
