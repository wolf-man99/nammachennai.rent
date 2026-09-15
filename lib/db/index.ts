import type { Store } from './store';
import { createFileStore } from './file-store';
import { createPostgresStore } from './postgres-store';
import { createRestStore } from './rest-store';

let instance: Store | null = null;

/** Thrown when no database is configured. Carries a message safe to show a user. */
export class DataLayerNotConfiguredError extends Error {
  readonly userMessage =
    'This deployment has no database configured yet, so nothing can be saved. ' +
    'If you run this site, set SUPABASE_URL and SUPABASE_SECRET_KEY (or DATABASE_URL).';

  constructor() {
    super(
      'No database configured. Set DATABASE_URL, or SUPABASE_URL together with ' +
        'SUPABASE_SECRET_KEY. The JSON file store is a development convenience and ' +
        'cannot persist on a serverless host, so it is refused in production.',
    );
    this.name = 'DataLayerNotConfiguredError';
  }
}

function postgresConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

function supabaseConfigured() {
  return Boolean(
    process.env.SUPABASE_URL &&
      (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY),
  );
}

/**
 * Whether the app can actually read and write.
 *
 * Exposed so routes can answer "why is nothing saving?" with something specific
 * instead of a generic 500.
 */
export function dataLayerConfigured(): boolean {
  return postgresConfigured() || supabaseConfigured() || process.env.NODE_ENV !== 'production';
}

/**
 * Resolve the active store, in order of preference:
 *
 *   DATABASE_URL                    -> direct Postgres (fastest, supports DDL)
 *   SUPABASE_URL + secret key       -> PostgREST over HTTPS, no connection string
 *   neither                         -> local JSON files, so a fresh clone runs
 */
export function db(): Store {
  if (instance) return instance;

  if (postgresConfigured()) {
    // The driver opens no connection until the first query, so this stays cheap.
    instance = createPostgresStore();
  } else if (supabaseConfigured()) {
    instance = createRestStore();
  } else if (process.env.NODE_ENV === 'production') {
    // Silently falling back to a file store in production is how submissions
    // disappear: a serverless filesystem is read-only or per-instance.
    throw new DataLayerNotConfiguredError();
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
