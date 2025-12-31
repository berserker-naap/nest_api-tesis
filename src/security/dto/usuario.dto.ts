import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, MinLength } from 'class-validator';
import { CreateUpdatePersonaDto } from './persona.dto';


export class PersonaResponseDto {
  @IsNotEmpty()
  id: number;

  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsOptional()
  @IsString()
  apellido?: string | null;
}

export class RolResponseDto {
  @IsNotEmpty()
  id: number;

  @IsString()
  @IsNotEmpty()
  nombre: string;
}

export class CreateUpdateUsuarioDto {
  @IsOptional()
  id?: number;

  @IsOptional()
  @IsString()
  login?: string;

  @IsOptional()
  @IsString()
  password?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => PersonaResponseDto)
  persona?: PersonaResponseDto | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RolResponseDto)
  roles?: RolResponseDto[];
}
