import { Controller, Get, Post, Body } from '@nestjs/common';

import { AuthService } from './auth.service';
import { Auth } from './decorators/auth.decorator';
import { GetUsuario } from './decorators/get-usuario.decorator';
import { Usuario } from 'src/security/entities/usuario.entity';
import { RegisterUsuarioDto, LoginDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}




  @Post('login')
  loginUsuario(@Body() loginDto: LoginDto ) {
    return this.authService.login( loginDto );
  }

  @Get('check-status')
  @Auth()
  checkAuthStatus(
    @GetUsuario() user: Usuario
  ) {
    return this.authService.checkAuthStatus( user );
  }

  // @Post('register')
  // createUsuario(@Body() registerUsuarioDto: RegisterUsuarioDto ) {
  //   return this.authService.create( registerUsuarioDto );
  // }

}
