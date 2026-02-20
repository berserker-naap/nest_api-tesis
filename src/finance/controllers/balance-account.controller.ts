import { Controller, Get } from '@nestjs/common';
import { Auth, GetUsuario } from 'src/auth/decorators';
import { Usuario } from 'src/security/entities/usuario.entity';
import { BalanceAccountService } from '../services/balance-account.service';

@Controller('balance-account')
@Auth()
export class BalanceAccountController {
  constructor(private readonly balanceAccountService: BalanceAccountService) {}

  @Get('summary')
  getSummary(@GetUsuario() usuario: Usuario) {
    return this.balanceAccountService.getResumen(usuario.id);
  }
}
