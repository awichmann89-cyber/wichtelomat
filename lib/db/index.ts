import { Pool } from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { attachDatabasePool } from '@vercel/functions';
import * as schema from './schema';

type DB = NodePgDatabase<typeof schema>;

const g = globalThis as unknown as { __wichtelDb?: DB };

function init(): DB {
  if (!g.__wichtelDb) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL ist nicht gesetzt.');
    const pool = new Pool({ connectionString: url, max: 5, idleTimeoutMillis: 10_000 });
    try {
      // Vercel Fluid Compute: Verbindungen sauber schließen, bevor die Instanz pausiert
      attachDatabasePool(pool);
    } catch {
      /* außerhalb von Vercel egal */
    }
    g.__wichtelDb = drizzle(pool, { schema });
  }
  return g.__wichtelDb;
}

/** Lazy initialisiert, damit `next build` ohne Datenbank funktioniert. */
export const db = new Proxy({} as DB, {
  get(_t, prop) {
    const real = init();
    const v = Reflect.get(real, prop);
    return typeof v === 'function' ? v.bind(real) : v;
  },
});

export * from './schema';
