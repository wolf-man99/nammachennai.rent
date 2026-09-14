import { db, eq, inList } from '@/lib/db';
import { CITY } from '@/lib/constants';
import type { PublicToletReport, ToletReport } from '@/types';
import { getLocalityMap } from './localities';

/** A board seen more than this long ago is very unlikely to still be live. */
export const STALE_AFTER_DAYS = 30;

export function toPublicTolet(row: ToletReport, localityName: Awaited<ReturnType<typeof getLocalityMap>>): PublicToletReport {
  const { phone, ...safe } = row;
  return {
    ...safe,
    locality: localityName.get(row.locality_id) ?? null,
    has_phone: Boolean(phone),
  };
}

export async function getToletReports(options: { localityIds?: string[]; limit?: number } = {}) {
  const where = [eq('city', CITY), eq('status', 'active')];
  if (options.localityIds?.length) where.push(inList('locality_id', options.localityIds));
  const [rows, localityMap] = await Promise.all([
    db().find<ToletReport>('tolet_reports', {
      where,
      orderBy: { field: 'seen_at', dir: 'desc' },
      limit: options.limit,
    }),
    getLocalityMap(),
  ]);
  return rows.map((r) => toPublicTolet(r, localityMap));
}

export function isStale(report: Pick<ToletReport, 'seen_at'>): boolean {
  const seen = new Date(report.seen_at).getTime();
  return Number.isFinite(seen) && Date.now() - seen > STALE_AFTER_DAYS * 86_400_000;
}

/** Surfaces boards that have aged out so the admin queue always has work to review. */
export async function getStaleToletReports(limit = 50) {
  const rows = await db().find<ToletReport>('tolet_reports', {
    where: [eq('city', CITY), eq('status', 'active')],
    orderBy: { field: 'seen_at', dir: 'asc' },
    limit: 200,
  });
  return rows.filter(isStale).slice(0, limit);
}
