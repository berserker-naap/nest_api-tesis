import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsInt } from 'class-validator';

export class CreateUpdateSubcategoriaDto {
  
  @IsString()
  @IsNotEmpty()
  nombre: string;

}

