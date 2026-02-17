import { Body, Controller, Get, Post } from '@nestjs/common';
import { Auth, GetClientIp, GetUsuario } from 'src/auth/decorators';
import { Usuario } from '../entities/usuario.entity';
import { CreateProfilePhoneDto, VerifyProfilePhoneOtpDto } from '../dto/profile-phone.dto';
import { ProfilePhoneService } from '../services/profile-phone.service';

@Controller('profile/phones')
@Auth()
export class ProfilePhoneController {
  constructor(private readonly profilePhoneService: ProfilePhoneService) {}

  @Get()
  findMyPhones(@GetUsuario() usuario: Usuario) {
    return this.profilePhoneService.findMyPhones(usuario);
  }

  @Post()
  createAndSendOtp(
    @Body() dto: CreateProfilePhoneDto,
    @GetUsuario() usuario: Usuario,
    @GetClientIp() ip: string,
  ) {
    return this.profilePhoneService.createAndSendOtp(dto, usuario, ip);
  }

  @Post('verify')
  verifyOtp(
    @Body() dto: VerifyProfilePhoneOtpDto,
    @GetUsuario() usuario: Usuario,
    @GetClientIp() ip: string,
  ) {
    return this.profilePhoneService.verifyOtp(dto, usuario, ip);
  }
}
