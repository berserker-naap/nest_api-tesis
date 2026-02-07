import { Type } from "class-transformer";
import { IsOptional, IsInt, IsNotEmpty, IsString, ValidateNested } from "class-validator";

export class MultitablaItemDto {
  @IsOptional() 
  @IsInt()
  id?: number; // ← solo presente si es update

  @IsNotEmpty()
  @IsString()
  nombre!: string;

  @IsString()
  valor!: string | null;

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

  @IsString()
  valor!: string | null;

  @IsString()
  valor2!: string | null;

  @IsOptional() // items es opcional, puede no enviarse
  @ValidateNested({ each: true })
  @Type(() => MultitablaItemDto)
  items?: MultitablaItemDto[] | null;
}
