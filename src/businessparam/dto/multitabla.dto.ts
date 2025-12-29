import { Type } from "class-transformer";
import { IsOptional, IsInt, IsNotEmpty, IsString, ValidateNested } from "class-validator";

export class MultitablaItemDto {
  @IsOptional()
  @IsInt()
  id?: number; // ← solo presente si es update

  @IsNotEmpty()
  @IsString()
  nombre: string;

  @IsOptional()
  @IsString()
  valor?: string | null;

  @IsOptional()
  @IsString()
  valor2?: string | null;
}

export class CreateUpdateMultitablaDto {
  @IsOptional() // ← solo requerido en update
  @IsInt()
  id?: number;

  @IsNotEmpty()
  @IsString()
  nombre: string;

  @IsOptional()
  @IsString()
  valor?: string | null;

  @IsOptional()
  @IsString()
  valor2?: string | null;
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => MultitablaItemDto)
  items?: MultitablaItemDto[];
}
