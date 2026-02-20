import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { Usuario } from 'src/security/entities/usuario.entity';
import { BalanceAccountController } from './controllers/balance-account.controller';
import { CategoriaFinanceController } from './controllers/categoria-finance.controller';
import { CuentaController } from './controllers/cuenta.controller';
import { EntidadFinancieraController } from './controllers/entidad-financiera.controller';
import { MonedaController } from './controllers/moneda.controller';
import { SubcategoriaFinanceController } from './controllers/subcategoria-finance.controller';
import { TipoCuentaController } from './controllers/tipo-cuenta.controller';
import { TransaccionFinanceController } from './controllers/transaccion-finance.controller';
import { CategoriaFinance } from './entities/categoria-finance.entity';
import { Cuenta } from './entities/cuenta.entity';
import { EntidadFinanciera } from './entities/entidad-financiera.entity';
import { Moneda } from './entities/moneda.entity';
import { SubcategoriaFinance } from './entities/subcategoria-finance.entity';
import { TipoCuenta } from './entities/tipo-cuenta.entity';
import { Transaccion } from './entities/transaccion.entity';
import { FinanceSeeder } from './seeders/finance.seeder';
import { CategoriaFinanceService } from './services/categoria-finance.service';
import { BalanceAccountService } from './services/balance-account.service';
import { CuentaService } from './services/cuenta.service';
import { EntidadFinancieraService } from './services/entidad-financiera.service';
import { MonedaService } from './services/moneda.service';
import { SubcategoriaFinanceService } from './services/subcategoria-finance.service';
import { TipoCuentaService } from './services/tipo-cuenta.service';
import { TransaccionFinanceService } from './services/transaccion-finance.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      Usuario,
      Moneda,
      TipoCuenta,
      EntidadFinanciera,
      CategoriaFinance,
      SubcategoriaFinance,
      Cuenta,
      Transaccion,
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          secret: configService.get('JWT_SECRET'),
          signOptions: {
            expiresIn: '2h',
          },
        };
      },
    }),
    AuthModule,
    RouterModule.register([
      {
        path: 'finance',
        module: FinanceModule,
      },
    ]),
  ],
  controllers: [
    MonedaController,
    TipoCuentaController,
    EntidadFinancieraController,
    CuentaController,
    CategoriaFinanceController,
    SubcategoriaFinanceController,
    BalanceAccountController,
    TransaccionFinanceController,
  ],
  providers: [
    FinanceSeeder,
    MonedaService,
    TipoCuentaService,
    EntidadFinancieraService,
    CuentaService,
    BalanceAccountService,
    CategoriaFinanceService,
    SubcategoriaFinanceService,
    TransaccionFinanceService,
  ],
  exports: [TransaccionFinanceService],
})
export class FinanceModule {}
