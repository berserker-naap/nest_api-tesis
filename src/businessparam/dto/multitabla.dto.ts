import { Type } from "class-transformer";
import { IsOptional, IsInt, IsNotEmpty, IsString, ValidateNested, ValidateIf } from "class-validator";

export class MultitablaItemDto {
  @IsOptional() 
  @IsInt()
  id?: number; // ← solo presente si es update

  @IsNotEmpty()
  @IsString()
  nombre!: string;

  @ValidateIf((o) => o.valor !== null)
  @IsString()
  valor!: string | null;

  @ValidateIf((o) => o.valor2 !== null)
  @IsString()
  valor2!: string | null;
}

export class CreateUpdateMultitablaDto {
  @IsOptional() // solo requerido para update, no para create
  @IsInt()
  id?: number;

  @IsNotEmpty()
  @IsString()
  nombre!: string;

  @ValidateIf((o) => o.valor !== null)
  @IsString()
  valor!: string | null;

  @ValidateIf((o) => o.valor2 !== null)
  @IsString()
  valor2!: string | null;

  @ValidateNested({ each: true })
  @Type(() => MultitablaItemDto)
  items!: MultitablaItemDto[] | null;
}
