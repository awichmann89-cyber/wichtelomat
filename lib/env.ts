import { createHash } from 'node:crypto';

export const APP_NAME = 'Wichtelomat';

export function appUrl(): string {
  const explicit = process.env.APP_URL;
  if (explicit) return explicit.replace(/\/$/, '');
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

export function mailFrom(): string {
  return process.env.MAIL_FROM || `${APP_NAME} <apps@alw-mediaworks.de>`;
}

/** Geheimnis für Cookie-Signaturen und Token-Verschlüsselung. */
export function appSecret(): string {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  // Fallback: aus der Datenbank-URL abgeleitet (nicht öffentlich). SESSION_SECRET setzen ist besser.
  const base = process.env.DATABASE_URL || 'wichtelomat-dev';
  return createHash('sha256').update(`wichtelomat:${base}`).digest('hex');
}

export function createCode(): string {
  return (process.env.CREATE_CODE || '').trim();
}

export const DELETE_AFTER_EVENT_DAYS = Number(process.env.DELETE_AFTER_EVENT_DAYS || 60);
export const DELETE_WITHOUT_DATE_DAYS = 400;
