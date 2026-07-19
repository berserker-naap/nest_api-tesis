import { Body, Controller, Post } from '@nestjs/common';
import { GetClientIp } from 'src/auth/decorators';
import {
  RequestPasswordRecoveryDto,
  ResetPasswordRecoveryDto,
  VerifyPasswordRecoveryDto,
} from '../dto/password-recovery.dto';
import { PasswordRecoveryService } from '../services/password-recovery.service';

@Controller('password-recovery')
export class PasswordRecoveryController {
  constructor(
    private readonly passwordRecoveryService: PasswordRecoveryService,
  ) {}

  @Post('request')
  requestRecovery(
    @Body() dto: RequestPasswordRecoveryDto,
    @GetClientIp() ip: string,
  ) {
    return this.passwordRecoveryService.requestRecovery(dto, ip);
  }

  @Post('verify')
  verifyCode(@Body() dto: VerifyPasswordRecoveryDto) {
    return this.passwordRecoveryService.verifyCode(dto);
  }

  @Post('reset')
  resetPassword(
    @Body() dto: ResetPasswordRecoveryDto,
    @GetClientIp() ip: string,
  ) {
    return this.passwordRecoveryService.resetPassword(dto, ip);
  }
}
