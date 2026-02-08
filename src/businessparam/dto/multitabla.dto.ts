import { Type } from "class-transformer";
import { IsOptional, IsInt, IsNotEmpty, IsString, ValidateNested } from "class-validator";
import { IsNullable } from "src/common/decorators/is-nullable.decorator";

export class MultitablaItemDto {
  @IsOptional() 
  @IsInt()
  id?: number; // ← solo presente si es update

  @IsNotEmpty()
  @IsString()
  nombre!: string;

  @IsNullable()
  @IsString()
  valor!: string | null;

  @IsNullable()
  @IsString()
  valor2!: string | null;
}

export class CreateUpdateMultitablaDto {

  @IsNotEmpty()
  @IsString()
  nombre!: string;

  @IsNullable()
  @IsString()
  valor!: string | null;

  @IsNullable()
  @IsString()
  valor2!: string | null;

  @ValidateNested({ each: true })
  @Type(() => MultitablaItemDto)
  items!: MultitablaItemDto[] | [];
}
