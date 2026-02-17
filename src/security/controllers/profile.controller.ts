import { Body, Controller, Get, Patch } from '@nestjs/common';
import { Auth, GetClientIp, GetUsuario } from 'src/auth/decorators';
import { Usuario } from '../entities/usuario.entity';
import { ProfileService } from '../services/profile.service';
import { UpdateProfileCredentialsDto, UpdateProfilePersonaDto } from '../dto/profile.dto';

@Controller('profile')
@Auth()
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('me')
  me(@GetUsuario() usuario: Usuario) {
    return this.profileService.me(usuario);
  }

  @Patch('credentials')
  updateCredentials(
    @GetUsuario() usuario: Usuario,
    @Body() dto: UpdateProfileCredentialsDto,
    @GetClientIp() ip: string,
  ) {
    return this.profileService.updateCredentials(usuario, dto, ip);
  }

  @Patch('persona')
  updatePersona(
    @GetUsuario() usuario: Usuario,
    @Body() dto: UpdateProfilePersonaDto,
    @GetClientIp() ip: string,
  ) {
    return this.profileService.updatePersona(usuario, dto, ip);
  }
}
