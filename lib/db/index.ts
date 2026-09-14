import type { Store } from './store';
import { createFileStore } from './file-store';
import { createPostgresStore } from './postgres-store';
import { createRestStore } from './rest-store';

let instance: Store | null = null;

/**
 * Resolve the active store, in order of preference:
 *
 *   DATABASE_URL                    -> direct Postgres (fastest, supports DDL)
 *   SUPABASE_URL + secret key       -> PostgREST over HTTPS, no connection string
 *   neither                         -> local JSON files, so a fresh clone runs
 */
export function db(): Store {
  if (instance) return instance;

  if (process.env.DATABASE_URL) {
    // The driver opens no connection until the first query, so this stays cheap.
    instance = createPostgresStore();
  } else if (process.env.SUPABASE_URL && (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    instance = createRestStore();
  } else {
    instance = createFileStore();
  }

  return instance;
}

export function usingPostgres() {
  return Boolean(process.env.DATABASE_URL);
}

/** Human-readable description of where data is going, shown in the admin console. */
export function driverLabel(): string {
  switch (db().driver) {
    case 'postgres':
      return 'Postgres (direct connection)';
    case 'rest':
      return 'Supabase over REST (no connection string)';
    default:
      return 'local file store (development)';
  }
}

export * from './store';
export type { TableName } from './schema';
