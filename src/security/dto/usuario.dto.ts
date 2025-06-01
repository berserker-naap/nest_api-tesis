import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { CreateUpdatePersonaDto } from './persona.dto';


export class CreateUsuarioDto {
  @IsString() @IsNotEmpty()
  login: string;

  @IsString() @IsNotEmpty()
  password: string;

  @IsOptional()
  idPersona?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateUpdatePersonaDto)
  persona?: CreateUpdatePersonaDto;

  @IsArray()
  roles: number[];
}

export class AsignarUsuarioRolesDto {
  @IsArray()
  roles: number[];
}

export class UsuarioResponseDto {
  id: number;
  login: string;
  persona?: {
    id: number;
    nombre: string;
    apellido: string;
  } | null; // ← Se aclara que puede ser null si no hay persona

  roles: {
    id: number;
    nombre: string;
  }[];
}
