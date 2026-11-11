export type Field = FormDataEntryValue | null | undefined;

export function cleanText(v: Field, max: number): string {
  return String(v ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

export function cleanMultiline(v: Field, max: number): string {
  return String(v ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max);
}

export function normalizeEmail(v: Field): string | null {
  const e = String(v ?? '')
    .trim()
    .toLowerCase();
  return e.length <= 200 && /^[^\s@<>,;]+@[^\s@<>,;]+\.[a-z]{2,}$/i.test(e) ? e : null;
}

/** null = leer, undefined = ungültig */
export function normalizeUrl(v: Field): string | null | undefined {
  let s = String(v ?? '').trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    if (!['http:', 'https:'].includes(u.protocol) || !u.hostname.includes('.')) return undefined;
    const out = u.toString();
    return out.length <= 2000 ? out : undefined;
  } catch {
    return undefined;
  }
}

/** Gruppenpasswörter werden mündlich weitergegeben → Groß-/Kleinschreibung egal. */
export function normalizeGroupPassword(v: Field): string {
  return String(v ?? '')
    .normalize('NFKC')
    .trim()
    .toLowerCase();
}

export function isIsoDate(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
}

function nameFromEmail(email: string): string {
  const local = email.split('@')[0].replace(/[._-]+/g, ' ').trim();
  return local.replace(/\b\p{L}/gu, (c) => c.toUpperCase()) || email;
}

/** Erkennt Zeilen wie „Anna <anna@x.de>“, „Anna, anna@x.de“, „Anna anna@x.de“ oder nur „anna@x.de“. */
export function parseBulk(text: string): { people: { name: string; email: string }[]; invalid: string[] } {
  const people: { name: string; email: string }[] = [];
  const invalid: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const match = line.match(/[^\s<>,;:"']+@[^\s<>,;:"']+/);
    const email = match ? normalizeEmail(match[0]) : null;
    if (!email) {
      invalid.push(line);
      continue;
    }
    const name = cleanText(line.replace(match![0], '').replace(/[<>,;:"'()]/g, ' '), 60) || nameFromEmail(email);
    people.push({ name, email });
  }
  return { people, invalid };
}
