import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsInt } from 'class-validator';

export class CreateUpdateCategoriaDto {
  
  @IsString()
  @IsNotEmpty()
  nombre: string;

}

