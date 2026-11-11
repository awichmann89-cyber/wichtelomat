// Läuft automatisch vor jedem `next build` (also bei jedem Vercel-Deployment).
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

if (!url) {
  if (process.env.VERCEL) {
    console.error('[migrate] DATABASE_URL fehlt. Verbinde zuerst eine Neon-Datenbank mit dem Vercel-Projekt.');
    process.exit(1);
  }
  console.warn('[migrate] DATABASE_URL fehlt – Migrationen übersprungen.');
  process.exit(0);
}

const pool = new pg.Pool({ connectionString: url, max: 1 });
try {
  await migrate(drizzle(pool), { migrationsFolder: './drizzle' });
  console.log('[migrate] Datenbank ist aktuell.');
} catch (err) {
  console.error('[migrate] Migration fehlgeschlagen:', err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
