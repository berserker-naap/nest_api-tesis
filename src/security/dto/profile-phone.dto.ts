import { IsNotEmpty, IsString, Length, Matches, MaxLength } from 'class-validator';

export class CreateProfilePhoneDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?\d{1,4}$/, {
    message: 'countryCode debe tener de 1 a 4 digitos (opcional +)',
  })
  countryCode!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6,15}$/, {
    message: 'phone debe tener de 6 a 15 digitos',
  })
  phone!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  alias!: string;
}

export class VerifyProfilePhoneOtpDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?\d{1,4}$/, {
    message: 'countryCode debe tener de 1 a 4 digitos (opcional +)',
  })
  countryCode!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6,15}$/, {
    message: 'phone debe tener de 6 a 15 digitos',
  })
  phone!: string;

  @IsString()
  @Length(6, 6)
  code!: string;
}
