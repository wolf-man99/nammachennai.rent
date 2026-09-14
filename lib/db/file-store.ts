import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { TABLES, type TableName } from './schema';
import type { Condition, FindOptions, Row, Store } from './store';

/**
 * Zero-dependency JSON-file store.
 *
 * It exists so `npm run dev` works the moment you clone the repo, before anyone
 * has provisioned Postgres. It is not a production driver: set DATABASE_URL and
 * the Postgres driver takes over automatically.
 */

const DATA_DIR = process.env.CHENNAI_DATA_DIR || path.join(process.cwd(), '.data');

type Table = Row[];
const cache = new Map<TableName, Table>();
let writeChain: Promise<unknown> = Promise.resolve();

function filePath(table: TableName) {
  return path.join(DATA_DIR, `${table}.json`);
}

async function load(table: TableName): Promise<Table> {
  const cached = cache.get(table);
  if (cached) return cached;
  let rows: Table = [];
  try {
    const raw = await fs.readFile(filePath(table), 'utf8');
    rows = JSON.parse(raw) as Table;
  } catch {
    rows = [];
  }
  cache.set(table, rows);
  return rows;
}

async function persist(table: TableName) {
  const rows = cache.get(table) ?? [];
  const run = async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const tmp = `${filePath(table)}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(rows, null, 2));
    await fs.rename(tmp, filePath(table));
  };
  writeChain = writeChain.then(run, run);
  return writeChain;
}

function compare(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return -1;
  if (b === null || b === undefined) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a) < String(b) ? -1 : 1;
}

function matches(row: Row, where: Condition[] = []): boolean {
  return where.every((c) => {
    const v = row[c.field] ?? null;
    switch (c.op) {
      case 'eq':
        return v === c.value;
      case 'neq':
        return v !== c.value;
      case 'in':
        return Array.isArray(c.value) && c.value.includes(v as never);
      case 'gte':
        return v !== null && compare(v, c.value) >= 0;
      case 'lte':
        return v !== null && compare(v, c.value) <= 0;
      case 'gt':
        return v !== null && compare(v, c.value) > 0;
      case 'lt':
        return v !== null && compare(v, c.value) < 0;
      case 'is_null':
        return v === null;
      case 'not_null':
        return v !== null;
      case 'ilike':
        return String(v ?? '').toLowerCase().includes(String(c.value ?? '').toLowerCase());
      default:
        return true;
    }
  });
}

function shape(table: TableName, values: Row): Row {
  const cols = TABLES[table] as readonly string[];
  const row: Row = {};
  for (const col of cols) row[col] = values[col] ?? null;
  if (!row.id) row.id = randomUUID();
  if (cols.includes('created_at') && !row.created_at) row.created_at = new Date().toISOString();
  return row;
}

export function createFileStore(): Store {
  return {
    driver: 'file',

    async migrate() {
      await fs.mkdir(DATA_DIR, { recursive: true });
    },

    async find<T = Row>(table: TableName, options: FindOptions = {}): Promise<T[]> {
      const rows = await load(table);
      let out = rows.filter((r) => matches(r, options.where));
      if (options.orderBy) {
        const { field, dir } = options.orderBy;
        out = [...out].sort((a, b) => (dir === 'asc' ? 1 : -1) * compare(a[field], b[field]));
      }
      const offset = options.offset ?? 0;
      const limit = options.limit ?? out.length;
      return out.slice(offset, offset + limit).map((r) => ({ ...r })) as T[];
    },

    async get<T = Row>(table: TableName, id: string): Promise<T | null> {
      const rows = await load(table);
      const found = rows.find((r) => r.id === id);
      return found ? ({ ...found } as T) : null;
    },

    async insert<T = Row>(table: TableName, values: Row): Promise<T> {
      const rows = await load(table);
      const row = shape(table, values);
      rows.push(row);
      await persist(table);
      return { ...row } as T;
    },

    async insertMany<T = Row>(table: TableName, values: Row[]): Promise<T[]> {
      const rows = await load(table);
      const created = values.map((v) => shape(table, v));
      rows.push(...created);
      await persist(table);
      return created.map((r) => ({ ...r })) as T[];
    },

    async update<T = Row>(table: TableName, id: string, patch: Row): Promise<T | null> {
      const rows = await load(table);
      const row = rows.find((r) => r.id === id);
      if (!row) return null;
      const cols = TABLES[table] as readonly string[];
      for (const [k, v] of Object.entries(patch)) {
        if (cols.includes(k) && k !== 'id') row[k] = v;
      }
      await persist(table);
      return { ...row } as T;
    },

    async remove(table: TableName, id: string): Promise<boolean> {
      const rows = await load(table);
      const idx = rows.findIndex((r) => r.id === id);
      if (idx === -1) return false;
      rows.splice(idx, 1);
      await persist(table);
      return true;
    },

    async count(table: TableName, where: Condition[] = []): Promise<number> {
      const rows = await load(table);
      return rows.filter((r) => matches(r, where)).length;
    },
  };
}
