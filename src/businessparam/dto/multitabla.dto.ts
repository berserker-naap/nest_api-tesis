import { Type } from 'class-transformer';
import {
  IsOptional,
  IsInt,
  IsNotEmpty,
  IsString,
  ValidateNested,
  ValidateIf,
  IsArray,
} from 'class-validator';
import { IsNullable } from 'src/common/decorators/is-nullable.decorator';

export class CreateMultitablaItemDto {
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

export class CreateMultitablaDto {
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
  @IsArray()
  @Type(() => CreateMultitablaItemDto)
  items!: CreateMultitablaItemDto[] | [];
}

export class UpdateMultitablaItemDto {

  @IsOptional()
  @IsNullable()
  @IsInt()
  id?: number | null;

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

export class UpdateMultitablaDto {

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
  @IsArray()
  @Type(() => UpdateMultitablaItemDto)
  items!: UpdateMultitablaItemDto[] | [];
}

export class MultitablaItemResponseDto {
  @IsInt()
  id!: number;

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

export class MultitablaResponseDto {
  @IsInt()
  id!: number;
  
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
  @IsArray()
  @Type(() => MultitablaItemResponseDto)
  items!: MultitablaItemResponseDto[] | [];
}
