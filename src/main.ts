import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { RequestContextService } from './common/services/request-context.service';
import {
  isProductionEnv,
  toBooleanEnv,
  toListEnv,
} from './common/utils/env.util';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');
  const requestContextService = app.get(RequestContextService);
  const isProduction = isProductionEnv(
    process.env.APP_ENV ?? process.env.NODE_ENV,
  );
  const globalPrefix = process.env.API_PREFIX?.trim() || 'api';
  const allowedOrigins = new Set(toListEnv(process.env.CORS_ALLOWED_ORIGINS));
  const allowNoOrigin = toBooleanEnv(process.env.CORS_ALLOW_NO_ORIGIN, true);
  const trustProxy = toBooleanEnv(process.env.APP_TRUST_PROXY, isProduction);
  const expressApp = app.getHttpAdapter().getInstance();

  app.setGlobalPrefix(globalPrefix);
  expressApp.set('trust proxy', trustProxy);
  app.use((req, _res, next) => requestContextService.runWithRequest(req, next));

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, allowNoOrigin);
      }

      const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(
        origin,
      );
      if (allowedOrigins.has(origin) || (!isProduction && isLocalhost)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
  });

  app.useGlobalFilters(app.get(AllExceptionsFilter));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
  logger.log(
    `App running on port ${process.env.PORT ?? 3000} with prefix ${globalPrefix}`,
  );
}

void bootstrap();
