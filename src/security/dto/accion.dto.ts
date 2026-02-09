import { IsNotEmpty, IsString, IsInt } from 'class-validator';

export class CreateAccionDto {
  @IsString()
  @IsNotEmpty()
  nombre!: string;
}

export class UpdateAccionDto {
  @IsString()
  @IsNotEmpty()
  nombre!: string;
}

export class AccionResponseDto {
  @IsInt()
  id!: number;

  @IsString()
  @IsNotEmpty()
  nombre!: string;
}
