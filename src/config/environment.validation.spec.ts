import { validateEnvironment } from './environment.validation';

describe('validateEnvironment', () => {
  const productionConfig = {
    APP_ENV: 'production',
    DB_HOST: 'server.database.windows.net',
    DB_USERNAME: 'user',
    DB_PASSWORD: 'password',
    DB_NAME: 'database',
    JWT_SECRET: 'secret',
    CORS_ALLOWED_ORIGINS: 'http://localhost',
    ML_SERVICE_URL: 'https://ml-service.azurewebsites.net',
  };

  it('forces database synchronization off in production', () => {
    const result = validateEnvironment({
      ...productionConfig,
      DB_SYNCHRONIZE: 'true',
    });

    expect(result.DB_SYNCHRONIZE).toBe('false');
  });

  it('rejects a local ML service URL in production', () => {
    expect(() =>
      validateEnvironment({
        ...productionConfig,
        ML_SERVICE_URL: 'http://127.0.0.1:8001',
      }),
    ).toThrow('ML_SERVICE_URL must use HTTPS');
  });

  it('rejects synchronization against a remote development database', () => {
    expect(() =>
      validateEnvironment({
        APP_ENV: 'development',
        DB_HOST: 'server.database.windows.net',
        DB_SYNCHRONIZE: 'true',
      }),
    ).toThrow('allowed only for a local development database');
  });

  it('allows synchronization against a local development database', () => {
    expect(() =>
      validateEnvironment({
        APP_ENV: 'development',
        DB_HOST: 'localhost',
        DB_SYNCHRONIZE: 'true',
      }),
    ).not.toThrow();
  });
});
