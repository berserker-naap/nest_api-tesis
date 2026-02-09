import { IsInt, IsOptional, IsString, Length } from 'class-validator';
import { IsNullable } from 'src/common/decorators/is-nullable.decorator';

export class CreateRolDto {
  @IsString()
  @Length(1, 100)
  nombre!: string;

  @IsNullable()
  @IsString()
  @Length(0, 255)
  descripcion?: string | null;
}

export class UpdateRolDto {
  @IsString()
  @Length(1, 100)
  nombre!: string;

  @IsNullable()
  @IsString()
  @Length(0, 255)
  descripcion!: string | null;
}

export class RolResponseDto {
  @IsInt()
  id!: number;

  @IsString()
  @Length(1, 100)
  nombre!: string;

  @IsNullable()
  @IsString()
  @Length(0, 255)
  descripcion!: string | null;
}
