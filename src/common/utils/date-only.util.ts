export function parseDateOnly(value: string): Date {
  const raw = String(value).trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) {
    throw new Error('Invalid date-only format, expected YYYY-MM-DD');
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  // Use local noon to avoid day shifts when serializing across timezones.
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function formatDateOnly(value: Date | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
