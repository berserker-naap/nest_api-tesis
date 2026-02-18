import { IsNotEmpty, IsString, Length, Matches, MaxLength } from 'class-validator';
import { IsInternationalPhoneConsistent } from '../validators/is-international-phone-consistent.decorator';

export class CreateProfilePhoneDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+\d{1,4}$/, {
    message: 'countryCode debe tener formato +NN (de 1 a 4 digitos)',
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
  @Matches(/^\d{8,19}$/, {
    message: 'internationalPhoneNumber debe tener solo digitos',
  })
  @IsInternationalPhoneConsistent({
    message: 'internationalPhoneNumber debe ser countryCode sin + seguido de phone',
  })
  internationalPhoneNumber!: string;


  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  alias!: string;
}

export class VerifyProfilePhoneOtpDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{8,19}$/, {
    message: 'internationalPhoneNumber debe tener solo digitos',
  })
  internationalPhoneNumber!: string;

  @IsString()
  @Length(6, 6)
  code!: string;
}
