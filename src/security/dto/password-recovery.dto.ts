import {
  IsEmail,
  IsNotEmpty,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RequestPasswordRecoveryDto {
  @IsEmail()
  @IsNotEmpty()
  login!: string;
}

export class ResetPasswordRecoveryDto {
  @IsEmail()
  @IsNotEmpty()
  login!: string;

  @IsNotEmpty()
  @Matches(/^\d{5}$/)
  code!: string;

  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(50)
  @Matches(/(?:(?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      'La contrasena debe tener una letra mayuscula, una letra minuscula y un numero',
  })
  password!: string;
}

export class VerifyPasswordRecoveryDto {
  @IsEmail()
  @IsNotEmpty()
  login!: string;

  @IsNotEmpty()
  @Matches(/^\d{5}$/)
  code!: string;
}
