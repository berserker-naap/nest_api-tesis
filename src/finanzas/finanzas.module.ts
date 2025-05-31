import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { Categoria } from './entities/categoria.entity';
import { RouterModule } from '@nestjs/core';
import { CategoriaService } from './services/categoria.service';
import { CategoriaController } from './controllers/categoria.controller';
import { Usuario } from 'src/security/entities/usuario.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      Usuario,Categoria]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          secret: configService.get('JWT_SECRET'),
          signOptions: {
            expiresIn: '2h'
          }
        }
      }
    }),
    AuthModule,
    RouterModule.register([
      {
        path: 'finanzas',
        module: FinanzasModule,
      },
    ]),
  ],
  controllers: [
    CategoriaController,
  ],
  providers: [
    CategoriaService,
  ],

})
export class FinanzasModule { }
