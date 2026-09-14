import type { Store } from './store';
import { createFileStore } from './file-store';
import { createPostgresStore } from './postgres-store';

let instance: Store | null = null;

/**
 * Resolve the active store.
 *
 * DATABASE_URL present -> Postgres (Supabase in production).
 * Otherwise            -> local JSON files, so a fresh clone runs immediately.
 */
export function db(): Store {
  if (instance) return instance;
  if (process.env.DATABASE_URL) {
    // The driver opens no connection until the first query, so this stays cheap.
    instance = createPostgresStore();
  } else {
    instance = createFileStore();
  }
  return instance;
}

export function usingPostgres() {
  return Boolean(process.env.DATABASE_URL);
}

export * from './store';
export type { TableName } from './schema';
