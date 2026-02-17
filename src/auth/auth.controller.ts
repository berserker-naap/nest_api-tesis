import { Controller, Get, Post, Body, Param } from '@nestjs/common';

import { AuthService } from './auth.service';
import { Auth } from './decorators/auth.decorator';
import { GetClientIp } from './decorators/get-client-ip.decorator';
import { GetUsuario } from './decorators/get-usuario.decorator';
import { Usuario } from 'src/security/entities/usuario.entity';
import {
  RegisterUsuarioRequestDto,
  LoginRequestDto,
  RegisterExternalUsuarioRequestDto,
} from './dto/auth.dto';

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

  @Post('register-single')
  createUsuario(
    @Body() registerUsuarioRequestDto: RegisterUsuarioRequestDto,
    @GetClientIp() ip: string,
  ) {
    return this.authService.create(registerUsuarioRequestDto, ip);
  }

  @Post('register-external')
  createUsuarioExternal(
    @Body() registerUsuarioRequestDto: RegisterExternalUsuarioRequestDto,
    @GetClientIp() ip: string,
  ) {
    return this.authService.createExternal(registerUsuarioRequestDto, ip);
  }

  @Get('validar-dni/:numeroDocumento')
  validarDni(@Param('numeroDocumento') numeroDocumento: string) {
    return this.authService.validarDni(numeroDocumento);
  }

}
