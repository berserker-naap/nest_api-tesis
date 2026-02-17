import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsInt, MinLength } from 'class-validator';
import { CreateProfileDto, ProfileResponseDto } from './persona.dto';

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
