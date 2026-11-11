export type FormState = {
  ok?: string;
  error?: string;
  step?: 'code';
  email?: string;
  /** ändert sich bei jeder Antwort, damit Effekte zuverlässig feuern */
  at?: number;
} | null;

export const ok = (msg: string): FormState => ({ ok: msg, at: Date.now() });
export const fail = (msg: string): FormState => ({ error: msg, at: Date.now() });

export const isUuid = (v: unknown): v is string =>
  typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
