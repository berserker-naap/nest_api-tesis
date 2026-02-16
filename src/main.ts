import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/http-exception.filter'; // Asegúrate de tener esta ruta correcta

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: (origin, callback) => {
      // Permite requests sin origin (Postman, mobile apps, server-to-server)
      if (!origin) return callback(null, true);

      // Permite localhost/127.0.0.1 en cualquier puerto de desarrollo
      const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      if (isLocalhost) return callback(null, true);

      return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
  });

  // 👇 Aquí registras el filtro personalizado
  app.useGlobalFilters(new AllExceptionsFilter());

  // 👇 Tu pipe de validación global sigue igual
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    })
  );

  await app.listen(process.env.PORT ?? 3000);
  logger.log(`App running on port ${ process.env.PORT }`);
}
bootstrap();
