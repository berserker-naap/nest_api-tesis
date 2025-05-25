import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/http-exception.filter'; // Asegúrate de tener esta ruta correcta

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: 'http://localhost:4200',
    credentials: true
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
