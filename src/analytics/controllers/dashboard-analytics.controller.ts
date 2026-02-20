import { Controller, Get } from '@nestjs/common';
import { Auth, GetUsuario } from 'src/auth/decorators';
import { Usuario } from 'src/security/entities/usuario.entity';
import { DashboardAnalyticsService } from '../services/dashboard-analytics.service';

@Controller('dashboard')
@Auth()
export class DashboardAnalyticsController {
  constructor(
    private readonly dashboardAnalyticsService: DashboardAnalyticsService,
  ) {}

  @Get('insights')
  getInsights(@GetUsuario() usuario: Usuario) {
    return this.dashboardAnalyticsService.getInsights(usuario);
  }
}
