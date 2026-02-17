import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';


export class RegisterUsuarioRequestDto {

    @IsString()
    login!: string;

    @IsString()
    @MinLength(6)
    @MaxLength(50)
    @Matches(
        /(?:(?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
        message: 'La contraseña debe tener una letra mayúscula, una letra minúscula y un número'
    })
    password!: string;
}


export class RegisterProfileMinRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombres!: string;

  @IsInt()
  idTipoDocumentoIdentidad!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  documentoIdentidad!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  apellidos?: string | null;
}

export class ValidarDniResponseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombres!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  apellidos!: string;

  @IsInt()
  idTipoDocumentoIdentidad!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  documentoIdentidad!: string;
}

export class RegisterExternalUsuarioRequestDto {
  @IsString()
  @IsNotEmpty()
  login!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(50)
  @Matches(/(?:(?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'La contraseña debe tener una letra mayúscula, una letra minúscula y un número',
  })
  password!: string;

  @ValidateNested()
  @Type(() => RegisterProfileMinRequestDto)
  profile!: RegisterProfileMinRequestDto;
}


export class LoginRequestDto {
  @IsNotEmpty()
  login!: string;

  @IsNotEmpty()
  password!: string;
}

export class SessionResponseDto {
  @IsString()
  @IsNotEmpty()
  login!: string;

  @IsOptional()
  @IsArray()
  roles!: string[] | [];

  @IsOptional()
  @IsArray()
  permisos!: any[] | [];

  @IsString()
  @IsNotEmpty()
  token!: string;
}
