import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class CreateUpdateRolDto {
  @IsString()
  @Length(1, 100)
  nombre: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  descripcion?: string;
}
