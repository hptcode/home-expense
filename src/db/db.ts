import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

type DB = NodePgDatabase<typeof schema>;

// Lazily create the DB handle so importing this module (e.g. at Next.js build
// time, or for a route that isn't queried) never opens a connection or throws
// on a missing DATABASE_URL. The first real query initializes the pool.
let _db: DB | null = null;
function getDb(): DB {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required (dedicated Postgres 17 — ADR-0003)');
  }
  if (!_db) {
    _db = drizzle(new Pool({ connectionString }), { schema });
  }
  return _db;
}

// Keep `import { db } from '@/db'` working everywhere; forward property access
// to the lazily-built instance.
export const db = new Proxy({} as DB, {
  get: (_target, prop) => getDb()[prop as keyof DB],
});
