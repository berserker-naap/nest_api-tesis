import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsInt } from 'class-validator';

export class CreateUpdateAccionDto {
  @IsString()
  nombre!: string;
}
