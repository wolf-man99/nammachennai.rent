import postgres, { type Sql } from 'postgres';
import { randomUUID } from 'node:crypto';
import { TABLES, assertColumn, type TableName } from './schema';
import type { Condition, FindOptions, Row, Store } from './store';
import { SCHEMA_SQL } from './schema-sql';

/** Production driver. Works against Supabase or any Postgres 14+. */

let sql: Sql | null = null;

export function getSql(): Sql {
  if (!sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    sql = postgres(url, {
      max: Number(process.env.DATABASE_POOL_MAX ?? 8),
      idle_timeout: 20,
      prepare: false, // pgbouncer / Supabase transaction pooling compatible
      ssl: url.includes('localhost') || url.includes('127.0.0.1') ? undefined : 'require',
    });
  }
  return sql;
}

function buildWhere(table: TableName, where: Condition[] = [], params: unknown[]): string {
  if (!where.length) return '';
  const parts = where.map((c) => {
    const col = `"${assertColumn(table, c.field)}"`;
    switch (c.op) {
      case 'is_null':
        return `${col} IS NULL`;
      case 'not_null':
        return `${col} IS NOT NULL`;
      case 'in': {
        const list = Array.isArray(c.value) ? c.value : [];
        if (!list.length) return 'FALSE';
        const placeholders = list.map((v) => {
          params.push(v);
          return `$${params.length}`;
        });
        return `${col} IN (${placeholders.join(', ')})`;
      }
      case 'ilike':
        params.push(`%${String(c.value ?? '')}%`);
        return `${col}::text ILIKE $${params.length}`;
      default: {
        const opMap: Record<string, string> = { eq: '=', neq: '<>', gte: '>=', lte: '<=', gt: '>', lt: '<' };
        params.push(c.value);
        return `${col} ${opMap[c.op] ?? '='} $${params.length}`;
      }
    }
  });
  return ` WHERE ${parts.join(' AND ')}`;
}

export function createPostgresStore(): Store {
  return {
    driver: 'postgres',

    async migrate() {
      await getSql().unsafe(SCHEMA_SQL);
    },

    async find<T = Row>(table: TableName, options: FindOptions = {}): Promise<T[]> {
      const params: unknown[] = [];
      let q = `SELECT * FROM "${table}"${buildWhere(table, options.where, params)}`;
      if (options.orderBy) {
        const col = assertColumn(table, options.orderBy.field);
        q += ` ORDER BY "${col}" ${options.orderBy.dir === 'asc' ? 'ASC' : 'DESC'} NULLS LAST`;
      }
      if (options.limit !== undefined) {
        params.push(Math.max(0, Math.floor(options.limit)));
        q += ` LIMIT $${params.length}`;
      }
      if (options.offset) {
        params.push(Math.max(0, Math.floor(options.offset)));
        q += ` OFFSET $${params.length}`;
      }
      return (await getSql().unsafe(q, params as never[])) as unknown as T[];
    },

    async get<T = Row>(table: TableName, id: string): Promise<T | null> {
      const rows = (await getSql().unsafe(`SELECT * FROM "${table}" WHERE id = $1 LIMIT 1`, [
        id,
      ] as never[])) as unknown as T[];
      return rows[0] ?? null;
    },

    async insert<T = Row>(table: TableName, values: Row): Promise<T> {
      const [row] = await this.insertMany<T>(table, [values]);
      return row;
    },

    async insertMany<T = Row>(table: TableName, values: Row[]): Promise<T[]> {
      if (!values.length) return [];
      const cols = (TABLES[table] as readonly string[]).filter((c) =>
        values.some((v) => v[c] !== undefined),
      );
      if (!cols.includes('id')) cols.unshift('id');

      const params: unknown[] = [];
      const tuples = values.map((v) => {
        const placeholders = cols.map((c) => {
          let value = v[c];
          if (c === 'id' && (value === undefined || value === null)) value = randomUUID();
          params.push(value === undefined ? null : value);
          return `$${params.length}`;
        });
        return `(${placeholders.join(', ')})`;
      });

      const q = `INSERT INTO "${table}" (${cols.map((c) => `"${c}"`).join(', ')})
                 VALUES ${tuples.join(', ')} RETURNING *`;
      return (await getSql().unsafe(q, params as never[])) as unknown as T[];
    },

    async update<T = Row>(table: TableName, id: string, patch: Row): Promise<T | null> {
      const entries = Object.entries(patch).filter(([k]) => k !== 'id' && (TABLES[table] as readonly string[]).includes(k));
      if (!entries.length) return this.get<T>(table, id);
      const params: unknown[] = [];
      const sets = entries.map(([k, v]) => {
        params.push(v);
        return `"${assertColumn(table, k)}" = $${params.length}`;
      });
      params.push(id);
      const q = `UPDATE "${table}" SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`;
      const rows = (await getSql().unsafe(q, params as never[])) as unknown as T[];
      return rows[0] ?? null;
    },

    async remove(table: TableName, id: string): Promise<boolean> {
      const rows = (await getSql().unsafe(`DELETE FROM "${table}" WHERE id = $1 RETURNING id`, [
        id,
      ] as never[])) as unknown as Row[];
      return rows.length > 0;
    },

    async count(table: TableName, where: Condition[] = []): Promise<number> {
      const params: unknown[] = [];
      const q = `SELECT COUNT(*)::int AS n FROM "${table}"${buildWhere(table, where, params)}`;
      const rows = (await getSql().unsafe(q, params as never[])) as unknown as { n: number }[];
      return rows[0]?.n ?? 0;
    },
  };
}
