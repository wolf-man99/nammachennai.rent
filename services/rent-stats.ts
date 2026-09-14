import { db, eq, inList } from '@/lib/db';
import { CITY, MIN_SAMPLE } from '@/lib/constants';
import type { Bhk, Locality, LocalityStats, RentSubmission, RentStats, TrendPoint } from '@/types';
import { getLocalities } from './localities';

/**
 * Rent intelligence.
 *
 * One rule governs this whole file: never emit a number the data does not
 * support. Every function returns null rather than a comforting estimate when
 * the sample is below MIN_SAMPLE, and the UI is built to render that honestly.
 */

const PUBLISHABLE: string[] = ['pending', 'verified'];

export function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  if (sorted.length === 1) return sorted[0];
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export function computeStats(values: number[], minSample = MIN_SAMPLE): RentStats | null {
  const clean = values.filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b);
  if (clean.length < minSample) return null;
  return {
    sample: clean.length,
    median: Math.round(percentile(clean, 0.5)),
    p25: Math.round(percentile(clean, 0.25)),
    p75: Math.round(percentile(clean, 0.75)),
    min: clean[0],
    max: clean[clean.length - 1],
    mean: Math.round(clean.reduce((s, v) => s + v, 0) / clean.length),
  };
}

export interface SubmissionQuery {
  localityIds?: string[];
  bhk?: Bhk;
  since?: string;
}

export async function getSubmissions(query: SubmissionQuery = {}): Promise<RentSubmission[]> {
  const where = [eq('city', CITY), inList('verification_status', PUBLISHABLE)];
  if (query.localityIds?.length) where.push(inList('locality_id', query.localityIds));
  if (query.bhk) where.push(eq('bhk', query.bhk));
  if (query.since) where.push({ field: 'created_at', op: 'gte', value: query.since });
  return db().find<RentSubmission>('rent_submissions', {
    where,
    orderBy: { field: 'created_at', dir: 'desc' },
  });
}

/** Trend compares the most recent 90 days against the 90 before it. */
function computeTrend(rows: RentSubmission[]): { pct: number; from: number; to: number } | null {
  const now = Date.now();
  const window = 90 * 86_400_000;
  const recent: number[] = [];
  const prior: number[] = [];
  for (const r of rows) {
    const age = now - new Date(r.created_at).getTime();
    if (age <= window) recent.push(r.rent);
    else if (age <= window * 2) prior.push(r.rent);
  }
  const a = computeStats(prior);
  const b = computeStats(recent);
  if (!a || !b) return null;
  return {
    pct: Number((((b.median - a.median) / a.median) * 100).toFixed(1)),
    from: a.median,
    to: b.median,
  };
}

export async function getAreaStats(localities: Locality[]): Promise<LocalityStats> {
  const ids = localities.map((l) => l.id);
  const store = db();

  const [rows, listingCount, toletCount] = await Promise.all([
    getSubmissions({ localityIds: ids }),
    store.count('listings', [inList('locality_id', ids), eq('status', 'active')]),
    store.count('tolet_reports', [inList('locality_id', ids), eq('status', 'active')]),
  ]);

  const byBhk: Partial<Record<Bhk, RentStats>> = {};
  const grouped = new Map<Bhk, number[]>();
  for (const r of rows) {
    const list = grouped.get(r.bhk) ?? [];
    list.push(r.rent);
    grouped.set(r.bhk, list);
  }
  for (const [bhk, values] of grouped) {
    const stats = computeStats(values);
    if (stats) byBhk[bhk] = stats;
  }

  return {
    locality: localities[0],
    overall: computeStats(rows.map((r) => r.rent)),
    byBhk,
    listingCount,
    toletCount,
    reportCount: rows.length,
    trend: computeTrend(rows),
  };
}

export async function getBhkStats(localities: Locality[], bhk: Bhk) {
  const ids = localities.map((l) => l.id);
  const rows = await getSubmissions({ localityIds: ids, bhk });
  return {
    stats: computeStats(rows.map((r) => r.rent)),
    trend: computeTrend(rows),
    rows,
  };
}

/* ------------------------------------------------------------------ */
/* City level                                                          */
/* ------------------------------------------------------------------ */

export interface CityIndex {
  medianTwoBhk: RentStats | null;
  totalReports: number;
  activeLocalities: number;
  activeListings: number;
  toletReports: number;
  trend: { pct: number; from: number; to: number } | null;
}

export async function getCityIndex(): Promise<CityIndex> {
  const store = db();
  const [rows, listings, tolets] = await Promise.all([
    getSubmissions(),
    store.count('listings', [eq('city', CITY), eq('status', 'active')]),
    store.count('tolet_reports', [eq('city', CITY), eq('status', 'active')]),
  ]);

  const twoBhk = rows.filter((r) => r.bhk === '2BHK');
  const localitiesWithData = new Set(rows.map((r) => r.locality_id));

  return {
    medianTwoBhk: computeStats(twoBhk.map((r) => r.rent)),
    totalReports: rows.length,
    activeLocalities: localitiesWithData.size,
    activeListings: listings,
    toletReports: tolets,
    trend: computeTrend(twoBhk),
  };
}

export interface LocalitySummary {
  locality: Locality;
  stats: RentStats | null;
  twoBhk: RentStats | null;
  reports: number;
  listings: number;
  trend: { pct: number; from: number; to: number } | null;
}

/** One pass over every submission - the homepage and map both read from this. */
export async function getLocalitySummaries(): Promise<LocalitySummary[]> {
  const [localities, rows, listingRows] = await Promise.all([
    getLocalities(),
    getSubmissions(),
    db().find<{ locality_id: string }>('listings', {
      where: [eq('city', CITY), eq('status', 'active')],
    }),
  ]);

  const byLocality = new Map<string, RentSubmission[]>();
  for (const r of rows) {
    const list = byLocality.get(r.locality_id) ?? [];
    list.push(r);
    byLocality.set(r.locality_id, list);
  }

  const listingCounts = new Map<string, number>();
  for (const l of listingRows) {
    listingCounts.set(l.locality_id, (listingCounts.get(l.locality_id) ?? 0) + 1);
  }

  return localities.map((locality) => {
    const subs = byLocality.get(locality.id) ?? [];
    return {
      locality,
      stats: computeStats(subs.map((s) => s.rent)),
      twoBhk: computeStats(subs.filter((s) => s.bhk === '2BHK').map((s) => s.rent)),
      reports: subs.length,
      listings: listingCounts.get(locality.id) ?? 0,
      trend: computeTrend(subs),
    };
  });
}

/**
 * "Best value" is median rent per BHK against the city median for the same BHK.
 * Only localities with a real 2BHK sample qualify, so nothing is inferred.
 */
export async function getBestValueLocalities(limit = 4) {
  const summaries = await getLocalitySummaries();
  const withData = summaries.filter((s) => s.twoBhk);
  if (withData.length < 3) return [];
  const cityMedian =
    withData.reduce((sum, s) => sum + (s.twoBhk?.median ?? 0), 0) / withData.length;
  return withData
    .map((s) => ({
      ...s,
      delta: Number(((((s.twoBhk?.median ?? 0) - cityMedian) / cityMedian) * 100).toFixed(1)),
    }))
    .sort((a, b) => a.delta - b.delta)
    .slice(0, limit);
}

/* ------------------------------------------------------------------ */
/* Trend series                                                        */
/* ------------------------------------------------------------------ */

/** Monthly medians. Buckets under MIN_SAMPLE return null so the chart shows a gap. */
export async function getTrendSeries(
  localityIds: string[] | null,
  bhk: Bhk | null,
  months = 6,
): Promise<TrendPoint[]> {
  const rows = await getSubmissions({
    localityIds: localityIds ?? undefined,
    bhk: bhk ?? undefined,
  });

  const buckets: TrendPoint[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const inBucket = rows.filter((r) => {
      const t = new Date(r.created_at).getTime();
      return t >= d.getTime() && t < next.getTime();
    });
    const stats = computeStats(inBucket.map((r) => r.rent), 3);
    buckets.push({
      label: d.toLocaleDateString('en-IN', { month: 'short' }),
      value: stats?.median ?? null,
      sample: inBucket.length,
    });
  }
  return buckets;
}

/** Histogram of the rent distribution, used on locality pages. */
export function distribution(values: number[], bins = 7): { from: number; to: number; count: number }[] {
  const clean = values.filter((v) => v > 0).sort((a, b) => a - b);
  if (clean.length < 3) return [];
  const lo = percentile(clean, 0.02);
  const hi = percentile(clean, 0.98);
  const span = Math.max(1, hi - lo);
  const width = span / bins;
  const out = Array.from({ length: bins }, (_, i) => ({
    from: Math.round(lo + i * width),
    to: Math.round(lo + (i + 1) * width),
    count: 0,
  }));
  for (const v of clean) {
    const idx = Math.min(bins - 1, Math.max(0, Math.floor((v - lo) / width)));
    out[idx].count += 1;
  }
  return out;
}
