import {
  normalizeAppEnvironment,
  toBooleanEnv,
} from '../common/utils/env.util';

const REQUIRED_PRODUCTION_VARIABLES = [
  'DB_HOST',
  'DB_USERNAME',
  'DB_PASSWORD',
  'DB_NAME',
  'JWT_SECRET',
  'CORS_ALLOWED_ORIGINS',
  'ML_SERVICE_URL',
] as const;

export function validateEnvironment(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const appEnvironment = normalizeAppEnvironment(
    toOptionalString(config.APP_ENV) ?? toOptionalString(config.NODE_ENV),
  );

  config.APP_ENV = appEnvironment;
  config.NODE_ENV = appEnvironment;

  if (appEnvironment === 'production') {
    config.DB_SYNCHRONIZE = 'false';
    validateRequiredProductionVariables(config);
    validateProductionServiceUrl(config.ML_SERVICE_URL);
    return config;
  }

  validateDevelopmentSynchronization(config);
  return config;
}

function validateRequiredProductionVariables(
  config: Record<string, unknown>,
): void {
  const missing = REQUIRED_PRODUCTION_VARIABLES.filter(
    (key) => !toOptionalString(config[key]),
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required production environment variables: ${missing.join(', ')}`,
    );
  }
}

function validateProductionServiceUrl(value: unknown): void {
  const rawUrl = toOptionalString(value);
  if (!rawUrl) {
    return;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new Error('ML_SERVICE_URL must be a valid absolute URL');
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  if (
    parsedUrl.protocol !== 'https:' ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1'
  ) {
    throw new Error(
      'ML_SERVICE_URL must use HTTPS and cannot point to localhost in production',
    );
  }
}

function validateDevelopmentSynchronization(
  config: Record<string, unknown>,
): void {
  const synchronize = toBooleanEnv(
    toOptionalString(config.DB_SYNCHRONIZE),
    false,
  );
  if (!synchronize) {
    return;
  }

  const host = toOptionalString(config.DB_HOST)?.toLowerCase();
  const isLocalDatabase =
    host === 'localhost' || host === '127.0.0.1' || host === '::1';

  if (!isLocalDatabase) {
    throw new Error(
      'DB_SYNCHRONIZE=true is allowed only for a local development database',
    );
  }
}

function toOptionalString(value: unknown): string | undefined {
  const normalized = String(value ?? '').trim();
  return normalized || undefined;
}
