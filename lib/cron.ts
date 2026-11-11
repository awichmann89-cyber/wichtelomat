import type { NextRequest } from 'next/server';
import { safeEqual } from './crypto';

/** Vercel Cron schickt „Authorization: Bearer $CRON_SECRET“. Ohne CRON_SECRET ist der Aufruf offen (harmlos). */
export function cronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return safeEqual(req.headers.get('authorization') ?? '', `Bearer ${secret}`);
}
