import { assertColumn, type TableName } from './schema';
import type { Condition, FindOptions, Row, Store } from './store';

/**
 * PostgREST driver.
 *
 * Talks to Supabase over HTTPS with the project's secret key instead of holding
 * a Postgres connection. That means a deployment never needs a database
 * connection string, and serverless functions never need a connection pool.
 *
 * The trade-off is that PostgREST cannot run DDL, so the schema is applied once
 * from db/schema.sql in the Supabase SQL editor. `migrate()` says so rather than
 * failing silently.
 */

/** Supabase caps a single response (db-max-rows, 1000 by default). */
const PAGE_SIZE = 1000;

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY are required for the REST driver');
  return { base: `${url.replace(/\/$/, '')}/rest/v1`, key };
}

function headers(extra: Record<string, string> = {}) {
  const { key } = config();
  return {
    apikey: key,
    authorization: `Bearer ${key}`,
    'content-type': 'application/json',
    ...extra,
  };
}

/** PostgREST list literals quote each member so commas inside values survive. */
function inList(values: unknown[]): string {
  const quoted = values.map((v) => `"${String(v).replace(/"/g, '\\"')}"`);
  return `(${quoted.join(',')})`;
}

function applyFilters(params: URLSearchParams, table: TableName, where: Condition[] = []) {
  for (const c of where) {
    const col = assertColumn(table, c.field);
    switch (c.op) {
      case 'eq':
        params.append(col, `eq.${c.value}`);
        break;
      case 'neq':
        params.append(col, `neq.${c.value}`);
        break;
      case 'gte':
        params.append(col, `gte.${c.value}`);
        break;
      case 'lte':
        params.append(col, `lte.${c.value}`);
        break;
      case 'gt':
        params.append(col, `gt.${c.value}`);
        break;
      case 'lt':
        params.append(col, `lt.${c.value}`);
        break;
      case 'is_null':
        params.append(col, 'is.null');
        break;
      case 'not_null':
        params.append(col, 'not.is.null');
        break;
      case 'ilike':
        params.append(col, `ilike.*${c.value}*`);
        break;
      case 'in': {
        const list = Array.isArray(c.value) ? c.value : [];
        // An empty IN matches nothing; PostgREST rejects `in.()`.
        params.append(col, list.length ? `in.${inList(list)}` : 'is.null');
        if (!list.length) params.append(col, 'not.is.null');
        break;
      }
    }
  }
}

async function request(path: string, init: RequestInit & { headers?: Record<string, string> }) {
  const { base } = config();
  const res = await fetch(`${base}/${path}`, { ...init, cache: 'no-store' });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Supabase REST ${init.method ?? 'GET'} ${path} failed (${res.status}): ${body.slice(0, 300)}`);
  }
  return res;
}

export function createRestStore(): Store {
  return {
    driver: 'rest',

    async migrate() {
      // DDL is not expressible over PostgREST. The schema is applied once from
      // db/schema.sql; this driver only ever reads and writes rows.
      throw new Error(
        'The REST driver cannot apply the schema. Paste db/schema.sql into the Supabase SQL editor, ' +
          'or set DATABASE_URL and run `npm run db:push`.',
      );
    },

    async find<T = Row>(table: TableName, options: FindOptions = {}): Promise<T[]> {
      const build = (limit: number, offset: number) => {
        const params = new URLSearchParams();
        params.set('select', '*');
        applyFilters(params, table, options.where);
        if (options.orderBy) {
          const col = assertColumn(table, options.orderBy.field);
          params.set('order', `${col}.${options.orderBy.dir === 'asc' ? 'asc' : 'desc'}.nullslast`);
        }
        params.set('limit', String(limit));
        if (offset) params.set('offset', String(offset));
        return `${table}?${params.toString()}`;
      };

      // An explicit limit is a single request.
      if (options.limit !== undefined) {
        const res = await request(build(options.limit, options.offset ?? 0), { method: 'GET', headers: headers() });
        return (await res.json()) as T[];
      }

      // Without one, page to exhaustion — a silently truncated read would skew
      // every median computed from it.
      const out: T[] = [];
      let offset = options.offset ?? 0;
      for (;;) {
        const res = await request(build(PAGE_SIZE, offset), { method: 'GET', headers: headers() });
        const batch = (await res.json()) as T[];
        out.push(...batch);
        if (batch.length < PAGE_SIZE) return out;
        offset += PAGE_SIZE;
      }
    },

    async get<T = Row>(table: TableName, id: string): Promise<T | null> {
      const params = new URLSearchParams({ select: '*', id: `eq.${id}`, limit: '1' });
      const res = await request(`${table}?${params.toString()}`, { method: 'GET', headers: headers() });
      const rows = (await res.json()) as T[];
      return rows[0] ?? null;
    },

    async insert<T = Row>(table: TableName, values: Row): Promise<T> {
      const [row] = await this.insertMany<T>(table, [values]);
      return row;
    },

    async insertMany<T = Row>(table: TableName, values: Row[]): Promise<T[]> {
      if (!values.length) return [];
      // Undefined keys are dropped so column defaults (id, created_at) apply.
      const payload = values.map((v) =>
        Object.fromEntries(Object.entries(v).filter(([, val]) => val !== undefined)),
      );
      const res = await request(table, {
        method: 'POST',
        headers: headers({ prefer: 'return=representation' }),
        body: JSON.stringify(payload),
      });
      return (await res.json()) as T[];
    },

    async update<T = Row>(table: TableName, id: string, patch: Row): Promise<T | null> {
      const body = Object.fromEntries(
        Object.entries(patch).filter(([k, v]) => k !== 'id' && v !== undefined && isColumn(table, k)),
      );
      if (!Object.keys(body).length) return this.get<T>(table, id);
      const params = new URLSearchParams({ id: `eq.${id}` });
      const res = await request(`${table}?${params.toString()}`, {
        method: 'PATCH',
        headers: headers({ prefer: 'return=representation' }),
        body: JSON.stringify(body),
      });
      const rows = (await res.json()) as T[];
      return rows[0] ?? null;
    },

    async remove(table: TableName, id: string): Promise<boolean> {
      const params = new URLSearchParams({ id: `eq.${id}` });
      const res = await request(`${table}?${params.toString()}`, {
        method: 'DELETE',
        headers: headers({ prefer: 'return=representation' }),
      });
      const rows = (await res.json()) as Row[];
      return rows.length > 0;
    },

    async count(table: TableName, where: Condition[] = []): Promise<number> {
      const params = new URLSearchParams({ select: 'id' });
      applyFilters(params, table, where);
      const res = await request(`${table}?${params.toString()}`, {
        method: 'GET',
        headers: headers({ prefer: 'count=exact', range: '0-0' }),
      });
      // Content-Range looks like "0-0/42"; "*/0" when empty.
      const total = res.headers.get('content-range')?.split('/')[1];
      return total && total !== '*' ? Number(total) : 0;
    },
  };
}

function isColumn(table: TableName, column: string): boolean {
  try {
    assertColumn(table, column);
    return true;
  } catch {
    return false;
  }
}
