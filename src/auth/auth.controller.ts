import { Controller, Get, Post, Body } from '@nestjs/common';

import { AuthService } from './auth.service';
import { Auth } from './decorators/auth.decorator';
import { GetUsuario } from './decorators/get-usuario.decorator';
import { Usuario } from 'src/security/entities/usuario.entity';
import { RegisterUsuarioRequestDto, LoginRequestDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  loginUsuario(@Body() loginRequestDto: LoginRequestDto ) {
    return this.authService.login( loginRequestDto );
  }

  @Get('check-status')
  @Auth()
  checkAuthStatus(
    @GetUsuario() user: Usuario
  ) {
    return this.authService.checkAuthStatus( user );
  }

  @Post('register')
  createUsuario(@Body() registerUsuarioRequestDto: RegisterUsuarioRequestDto ) {
    return this.authService.create( registerUsuarioRequestDto );
  }

}
