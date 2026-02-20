import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { RouterModule } from '@nestjs/core';
import { Usuario } from 'src/security/entities/usuario.entity';
import { Multitabla } from 'src/businessparam/entities/multitabla.entity';
import { MultitablaController } from './controllers/multitabla.controller';
import { BusinessparamSeeder } from './seeders/businessparam.seeder';
import { MultitablaService } from './services/multitabla.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      Usuario,Multitabla]),
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
        path: 'businessparam',
        module: BusinessparamModule,
      },
    ]),
  ],
  controllers: [
    MultitablaController,
  ],
  providers: [
    BusinessparamSeeder,
    MultitablaService,
  ],

})
export class BusinessparamModule { }
