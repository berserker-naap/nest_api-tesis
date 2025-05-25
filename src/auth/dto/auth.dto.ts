import { IsString, IsEmail, MinLength, MaxLength, Matches, IsNotEmpty } from "class-validator";


export class RegisterUsuarioDto {

    @IsString()
    login: string;

    @IsString()
    @MinLength(6)
    @MaxLength(50)
    @Matches(
        /(?:(?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
        message: 'The password must have a Uppercase, lowercase letter and a number'
    })
    password: string;
}

export class LoginDto {
    @IsNotEmpty()
    login: string;
  
    @IsNotEmpty()
    password: string;
  }
  