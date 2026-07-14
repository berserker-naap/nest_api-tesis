export const APP_ERROR_ALREADY_LOGGED = Symbol.for('APP_ERROR_ALREADY_LOGGED');

export function markErrorAsLogged(error: unknown): void {
  if (!error || typeof error !== 'object') {
    return;
  }

  try {
    Object.defineProperty(error, APP_ERROR_ALREADY_LOGGED, {
      value: true,
      configurable: true,
      enumerable: false,
      writable: true,
    });
  } catch {
    // Ignorar errores sobre errores inmutables.
  }
}

export function isErrorAlreadyLogged(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  return Boolean((error as Record<PropertyKey, unknown>)[APP_ERROR_ALREADY_LOGGED]);
}
