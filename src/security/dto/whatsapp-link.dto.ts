import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class RequestWhatsappLinkDto {
  @IsString()
  @IsNotEmpty()
  countryCode!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;
}

export class ConfirmWhatsappLinkDto {
  @IsString()
  @IsNotEmpty()
  countryCode!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsString()
  @Length(6, 6)
  code!: string;
}

export class UnlinkWhatsappDto {
  @IsString()
  @IsNotEmpty()
  countryCode!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsOptional()
  @IsString()
  motivo?: string;
}
