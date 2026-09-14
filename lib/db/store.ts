import type { TableName } from './schema';

export type FilterOp = 'eq' | 'neq' | 'in' | 'gte' | 'lte' | 'gt' | 'lt' | 'is_null' | 'not_null' | 'ilike';

export interface Condition {
  field: string;
  op: FilterOp;
  value?: unknown;
}

export interface FindOptions {
  where?: Condition[];
  orderBy?: { field: string; dir: 'asc' | 'desc' };
  limit?: number;
  offset?: number;
}

export type Row = Record<string, unknown>;

export interface Store {
  readonly driver: 'postgres' | 'file';
  find<T = Row>(table: TableName, options?: FindOptions): Promise<T[]>;
  get<T = Row>(table: TableName, id: string): Promise<T | null>;
  insert<T = Row>(table: TableName, values: Row): Promise<T>;
  insertMany<T = Row>(table: TableName, values: Row[]): Promise<T[]>;
  update<T = Row>(table: TableName, id: string, patch: Row): Promise<T | null>;
  remove(table: TableName, id: string): Promise<boolean>;
  count(table: TableName, where?: Condition[]): Promise<number>;
  /** Idempotent schema creation. No-op for the file driver. */
  migrate(): Promise<void>;
}

export const eq = (field: string, value: unknown): Condition => ({ field, op: 'eq', value });
export const inList = (field: string, value: unknown[]): Condition => ({ field, op: 'in', value });
export const gte = (field: string, value: unknown): Condition => ({ field, op: 'gte', value });
export const lte = (field: string, value: unknown): Condition => ({ field, op: 'lte', value });
