import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsInt } from 'class-validator';

export class CreateUpdateModuloDto {
  
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  icono: string;

}
