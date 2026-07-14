export function normalizeLogin(value: string | null | undefined): string {
  return String(value ?? '').trim().toLowerCase();
}
