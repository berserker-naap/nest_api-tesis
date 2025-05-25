import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { Usuario } from 'src/security/entities/usuario.entity';
import { SecurityModule } from 'src/security/security.module';

@Module({

  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Usuario]),
    PassportModule.register({ defaultStrategy: 'jwt' }),

    JwtModule.registerAsync({
      imports: [ ConfigModule ],
      inject: [ ConfigService ],
      useFactory: ( configService: ConfigService ) => {
        console.log('JWT Secret', configService.get('JWT_SECRET') )
        console.log('JWT SECRET', process.env.JWT_SECRET)
        return {
          secret: configService.get('JWT_SECRET'),
          signOptions: {
            expiresIn:'2h'
          }
        }
      }
    })

  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy ],
  exports: [ TypeOrmModule, JwtStrategy, PassportModule, JwtModule, AuthService ]
})
export class AuthModule {}
