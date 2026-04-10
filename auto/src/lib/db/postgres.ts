import 'server-only';
import postgres from 'postgres';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

let sql: ReturnType<typeof postgres> | null = null;

export function getSql(): ReturnType<typeof postgres> | null {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return null;
  if (!sql) {
    sql = postgres(url, { max: 1, prepare: false });
  }
  return sql;
}

let migrated = false;

export async function ensureSchema(): Promise<void> {
  const client = getSql();
  if (!client || migrated) return;
  const path = join(process.cwd(), 'src/lib/db/schema.sql');
  const ddl = readFileSync(path, 'utf8');
  await client.unsafe(ddl);
  migrated = true;
}
