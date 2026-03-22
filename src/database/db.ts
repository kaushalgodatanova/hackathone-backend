import 'dotenv/config';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL is not set');
}

/** Explicit pool: Railway/Vercel MySQL often needs TLS; `drizzle(string)` alone uses a minimal pool config. */
export const pool = mysql.createPool({
  uri: url,
  ssl: /railway|rlwy\.net/i.test(url) ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle({ client: pool });
