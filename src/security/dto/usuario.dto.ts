import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsInt, MinLength, IsDate } from 'class-validator';
import { IsNullable } from 'src/common/decorators/is-nullable.decorator';

export class RolResponseDto {
  @IsInt()
  @IsNotEmpty()
  id!: number;

  @IsString()
  @IsNotEmpty()
  nombre!: string;
}

export class CreateUsuarioDto {
  @IsString()
  @IsNotEmpty()
  login!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateProfileDto)
  profile?: CreateProfileDto | null;

  @IsOptional()
  @IsInt()
  idProfile?: number | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RolResponseDto)
  roles?: RolResponseDto[];
}

export class UpdateUsuarioDto {
  @IsOptional()
  @IsString()
  login?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateProfileDto)
  profile?: CreateProfileDto | null;

  @IsOptional()
  @IsInt()
  idProfile?: number | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RolResponseDto)
  roles?: RolResponseDto[];
}

export class UsuarioResponseDto {
  @IsInt()
  id!: number;

  @IsString()
  @IsNotEmpty()
  login!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ProfileResponseDto)
  profile?: ProfileResponseDto | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RolResponseDto)
  roles?: RolResponseDto[];
}

// Mantener para compatibilidad hacia atrás (deprecated)
export class CreateUpdateUsuarioDto extends UpdateUsuarioDto {
  @IsOptional()
  id?: number;
}


export class RolIdDto {
  @IsInt()
  @IsNotEmpty()
  id!: number;
}

export class AsignarUsuarioRolesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RolIdDto)
  roles!: RolIdDto[];
}



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
