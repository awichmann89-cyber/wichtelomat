export const TZ = 'Europe/Berlin';

function todayIso(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
}

function isoToUtc(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function formatDate(iso: string | null | undefined, withWeekday = true): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat('de-DE', {
    weekday: withWeekday ? 'long' : undefined,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(isoToUtc(iso)));
}

export function daysUntil(iso: string): number {
  return Math.round((isoToUtc(iso) - isoToUtc(todayIso())) / 86_400_000);
}

export function countdown(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = daysUntil(iso);
  if (d > 1) return `Noch ${d} Tage bis zur Bescherung`;
  if (d === 1) return 'Morgen ist Bescherung!';
  if (d === 0) return 'Heute ist Bescherung!';
  return 'Die Bescherung ist vorbei';
}

export function formatDateTime(d: Date | null | undefined): string {
  if (!d) return '';
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  }).format(d);
}

export function esc(s: string | null | undefined): string {
  return String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}
