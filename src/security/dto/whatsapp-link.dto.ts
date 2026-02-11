import { IsIn, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class RequestWhatsappLinkDto {
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsIn(['SMS', 'EMAIL'])
  via!: 'SMS' | 'EMAIL';

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  emailDestino?: string;
}

export class ConfirmWhatsappLinkDto {
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsString()
  @Length(6, 6)
  code!: string;
}

export class UnlinkWhatsappDto {
  @IsOptional()
  @IsString()
  motivo?: string;
}
