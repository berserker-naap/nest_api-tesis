import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { SecurityModule } from './security/security.module';

@Module({
  imports: [
    ConfigModule.forRoot(),

    TypeOrmModule.forRoot({
      type: 'mssql',
      host: 'servidor-tesisunt.database.windows.net', // o la IP o nombre de tu servidor
      username: 'servidor-tesisunt',
      password: 'Unix456nel!!',
      database: 'basedatos-tesisunt',
      entities: [__dirname + '/**/*.entity{.ts,.js}'], // ruta donde estarán tus entidades
      synchronize: true, // Ojo: true crea automáticamente tablas. Para producción mejor false.
      options: {
        encrypt: true, // poner true si estás en Azure o quieres forzar encriptación de conexión
        trustServerCertificate: true, // usual para desarrollo local
      },
    }),
    AuthModule,
    SecurityModule,
  ],

  controllers: [],
  providers: [],
})
export class AppModule {}
