export function toBooleanEnv(
  value: string | undefined,
  defaultValue = false,
): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

export function toNumberEnv(
  value: string | undefined,
  defaultValue: number,
): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

export function toListEnv(value: string | undefined): string[] {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function isProductionEnv(value: string | undefined): boolean {
  return ['production', 'prod'].includes(String(value ?? '').trim().toLowerCase());
}

export type AppEnvironment = 'development' | 'test' | 'production';

export function normalizeAppEnvironment(
  value: string | undefined,
): AppEnvironment {
  const normalized = String(value ?? '').trim().toLowerCase();

  if (isProductionEnv(normalized)) {
    return 'production';
  }

  if (normalized === 'test') {
    return 'test';
  }

  return 'development';
}
