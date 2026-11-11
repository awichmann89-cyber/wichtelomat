import { sql } from 'drizzle-orm';
import { headers } from 'next/headers';
import { db } from './db';
import { sha256 } from './crypto';

/** Zählt Versuche pro Schlüssel in einem Zeitfenster. true = erlaubt. */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const res = await db.execute<{ count: number }>(sql`
    insert into rate_limits (key, count, reset_at)
    values (${key}, 1, now() + make_interval(secs => ${windowSeconds}))
    on conflict (key) do update set
      count = case when rate_limits.reset_at < now() then 1 else rate_limits.count + 1 end,
      reset_at = case when rate_limits.reset_at < now() then excluded.reset_at else rate_limits.reset_at end
    returning count
  `);
  return Number(res.rows[0]?.count ?? 0) <= limit;
}

export async function clientKey(): Promise<string> {
  const h = await headers();
  const ip = h.get('x-real-ip') || h.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  return sha256(`ip:${ip}`).slice(0, 24);
}
