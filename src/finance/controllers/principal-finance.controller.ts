import { Controller, Get } from '@nestjs/common';
import { Auth, GetUsuario } from 'src/auth/decorators';
import { Usuario } from 'src/security/entities/usuario.entity';
import { PrincipalFinanceService } from '../services/principal-finance.service';

@Controller('principal')
@Auth()
export class PrincipalFinanceController {
  constructor(private readonly principalFinanceService: PrincipalFinanceService) {}

  @Get('summary')
  getSummary(@GetUsuario() usuario: Usuario) {
    return this.principalFinanceService.getResumen(usuario.id);
  }
}
