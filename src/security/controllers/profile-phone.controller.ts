import { Body, Controller, Get, Post } from '@nestjs/common';
import { Auth, GetClientIp, GetUsuario } from 'src/auth/decorators';
import { Usuario } from '../entities/usuario.entity';
import {
  CreateProfilePhoneDto,
  RemoveProfilePhoneDto,
  ResendProfilePhoneOtpDto,
  VerifyProfilePhoneOtpDto,
} from '../dto/profile-phone.dto';
import { ProfilePhoneService } from '../services/profile-phone.service';

@Controller('profile/phones')
@Auth()
export class ProfilePhoneController {
  constructor(private readonly profilePhoneService: ProfilePhoneService) {}

  @Post('add')
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

  @Post('resend')
  resendOtp(
    @Body() dto: ResendProfilePhoneOtpDto,
    @GetUsuario() usuario: Usuario,
    @GetClientIp() ip: string,
  ) {
    return this.profilePhoneService.resendOtp(dto, usuario, ip);
  }

  @Post('remove')
  removePhone(
    @Body() dto: RemoveProfilePhoneDto,
    @GetUsuario() usuario: Usuario,
    @GetClientIp() ip: string,
  ) {
    return this.profilePhoneService.removePhone(dto, usuario, ip);
  }
}
