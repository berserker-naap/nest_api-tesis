import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class CreateProfilePhoneDto {
  @IsString()
  @IsNotEmpty()
  countryCode!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsOptional()
  @IsString()
  alias?: string | null;
}

export class VerifyProfilePhoneOtpDto {
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
