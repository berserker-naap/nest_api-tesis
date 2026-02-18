import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PermisoController } from './controllers/permiso.controller';
import { RolController } from './controllers/rol.controller';
import { PermisoService } from './services/permiso.service';
import { RolService } from './services/rol.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Permiso } from './entities/permiso.entity';
import { Rol } from './entities/rol.entity';
import { AuthModule } from 'src/auth/auth.module';
import { Usuario } from './entities/usuario.entity';
import { Accion } from './entities/accion.entity';
import { Profile } from './entities/profile.entity';
import { UsuarioRol } from './entities/usuario-rol.entity';
import { Opcion } from './entities/opcion.entity';
import { Modulo } from './entities/modulo.entity';
import { OpcionController } from './controllers/opcion.controller';
import { OpcionService } from './services/opcion.service';
import { RouterModule } from '@nestjs/core';
import { AccionService } from './services/accion.service';
import { ModuloService } from './services/modulo.service';
import { AccionController } from './controllers/accion.controller';
import { ModuloController } from './controllers/modulo.controller';
import { UsuarioService } from './services/usuario.service';
import { UsuarioController } from './controllers/usuario.controller';
import { Multitabla } from 'src/businessparam/entities/multitabla.entity';
import { OtpVerificacion } from './entities/otp-verificacion.entity';
import { ProfilePhoneController } from './controllers/profile-phone.controller';
import { OtpVerificacionService } from './services/otp-verificacion.service';
import { ProfileController } from './controllers/profile.controller';
import { ProfileService } from './services/profile.service';
import { ReniecData } from './entities/reniec-data.entity';
import { BlobStorageService } from 'src/common/services/blob-storage.service';
import { WhatsappSenderService } from 'src/common/services/whatsapp-sender.service';
import { ProfilePhone } from './entities/profile-phone.entity';
import { ProfilePhoneService } from './services/profile-phone.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      Accion,
      Modulo,
      Opcion,
      Permiso,
      Multitabla,
      Profile,
      ReniecData,
      Rol,
      UsuarioRol,
      Usuario,
      ProfilePhone,
      OtpVerificacion]),
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
        path: 'security',
        module: SecurityModule,
      },
    ]),
  ],
  controllers: [
    AccionController,
    ModuloController,
    OpcionController,
    PermisoController, 
    RolController,
    UsuarioController,
    ProfilePhoneController,
    ProfileController,
  ],
  providers: [
    AccionService,
    ModuloService,
    OpcionService,
    PermisoService, 
    RolService,
    UsuarioService,
    OtpVerificacionService,
    ProfileService,
    ProfilePhoneService,
    BlobStorageService,
    WhatsappSenderService,
  ],
  exports: [ProfilePhoneService, OtpVerificacionService, WhatsappSenderService],

})
export class SecurityModule { }
