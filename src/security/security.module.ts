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
import { Persona } from './entities/persona.entity';
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
import { PersonaService } from './services/persona.service';
import { PersonaController } from './controllers/persona.controller';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      Accion,
      Modulo,
      Opcion,
      Permiso,
      Persona,
      Rol,
      UsuarioRol,
      Usuario]),
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
    PersonaController 
  ],
  providers: [
    AccionService,
    ModuloService,
    OpcionService,
    PermisoService, 
    RolService,
    UsuarioService,
    PersonaService
  ],

})
export class SecurityModule { }
