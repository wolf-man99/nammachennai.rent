import { db, eq } from '@/lib/db';
import { CHENNAI_LOCALITIES, CHENNAI_ZONES, type ZoneSeed } from '@/data/localities';
import { CITY } from '@/lib/constants';
import { haversineKm } from '@/lib/geo';
import { localityMatches } from '@/lib/search-query';
import type { Locality } from '@/types';

/**
 * Localities are reference data, not user data, so the table self-heals from
 * data/localities.ts on first read. Adding an area is a one-line PR.
 */

let ensured: Promise<void> | null = null;

async function ensureLocalities(): Promise<void> {
  const store = db();
  const existing = await store.find<Locality>('localities', { where: [eq('city', CITY)] });
  const bySlug = new Map(existing.map((l) => [l.slug, l]));
  const missing = CHENNAI_LOCALITIES.filter((l) => !bySlug.has(l.slug));
  if (!missing.length) return;

  try {
    await store.insertMany(
      'localities',
      missing.map((l) => ({ ...l, city: CITY })),
    );
    localityCache = null;
  } catch (err) {
    /*
     * Seeding is a convenience, not a render dependency. A write is illegal
     * inside a static prerender, and a locality page must not 500 because the
     * reference table was behind - run `npm run seed` to populate it properly.
     */
    console.warn(
      `Could not seed ${missing.length} localities (${err instanceof Error ? err.message.slice(0, 120) : 'unknown'}). ` +
        'Run `npm run seed`.',
    );
  }
}

function ensureOnce(): Promise<void> {
  if (!ensured) {
    ensured = ensureLocalities().catch((err) => {
      ensured = null;
      throw err;
    });
  }
  return ensured;
}

/**
 * Localities are reference data read by almost every render, several times per
 * page. Caching them in process turns the sitemap's ~290 area lookups from
 * ~290 round trips into one.
 */
const LOCALITY_TTL_MS = 60_000;
let localityCache: { at: number; rows: Locality[] } | null = null;

export async function getLocalities(): Promise<Locality[]> {
  if (localityCache && Date.now() - localityCache.at < LOCALITY_TTL_MS) {
    return localityCache.rows;
  }

  await ensureOnce();
  const rows = await db().find<Locality>('localities', { where: [eq('city', CITY)] });
  const sorted = rows.sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
  localityCache = { at: Date.now(), rows: sorted };
  return sorted;
}

export async function getLocalityBySlug(slug: string): Promise<Locality | null> {
  const all = await getLocalities();
  return all.find((l) => l.slug === slug) ?? null;
}

export async function getLocalityMap(): Promise<Map<string, Locality>> {
  const all = await getLocalities();
  return new Map(all.map((l) => [l.id, l]));
}

export async function searchLocalities(query: string, limit = 8): Promise<Locality[]> {
  const all = await getLocalities();
  const q = query.trim().toLowerCase();
  if (!q) return all.filter((l) => l.tier === 1).slice(0, limit);
  const scored = all
    .map((l) => {
      const name = l.name.toLowerCase();
      let score = -1;
      if (name === q) score = 100;
      else if (name.startsWith(q)) score = 80;
      else if (name.includes(q)) score = 60;
      else if ((l.zone ?? '').toLowerCase().includes(q)) score = 40;
      else if (localityMatches(l.name, l.zone, q)) score = 25;
      return { l, score: score - l.tier };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.l);
}

/* ------------------------------------------------------------------ */
/* Zones - corridor pages like /chennai/omr                            */
/* ------------------------------------------------------------------ */

export function getZones(): ZoneSeed[] {
  return CHENNAI_ZONES;
}

export function getZoneBySlug(slug: string): ZoneSeed | null {
  return CHENNAI_ZONES.find((z) => z.slug === slug) ?? null;
}

export interface Area {
  kind: 'locality' | 'zone';
  name: string;
  slug: string;
  blurb: string | null;
  latitude: number;
  longitude: number;
  /** Every locality whose data rolls up into this area. */
  localities: Locality[];
  zone: string | null;
}

/** Resolves /chennai/[slug] to either a single locality or a whole corridor. */
export async function resolveArea(slug: string): Promise<Area | null> {
  const all = await getLocalities();

  const locality = all.find((l) => l.slug === slug);
  if (locality) {
    return {
      kind: 'locality',
      name: locality.name,
      slug: locality.slug,
      blurb: null,
      latitude: locality.latitude,
      longitude: locality.longitude,
      localities: [locality],
      zone: locality.zone,
    };
  }

  const zone = getZoneBySlug(slug);
  if (zone) {
    const members = all.filter((l) => l.zone === zone.name);
    if (!members.length) return null;
    return {
      kind: 'zone',
      name: zone.name,
      slug: zone.slug,
      blurb: zone.blurb,
      latitude: zone.latitude,
      longitude: zone.longitude,
      localities: members,
      zone: zone.name,
    };
  }

  return null;
}

export async function nearbyLocalities(area: Area, limit = 5): Promise<Locality[]> {
  const all = await getLocalities();
  const excluded = new Set(area.localities.map((l) => l.id));
  return all
    .filter((l) => !excluded.has(l.id))
    .map((l) => ({ l, d: haversineKm(area, l) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, limit)
    .map((x) => x.l);
}

/**
 * Areas worth prerendering at build time.
 *
 * With ~280 localities, prerendering every one would build a thousand pages that
 * mostly say "not enough renter data yet". The corridors and the high-demand
 * localities are prerendered; the rest render on demand and are cached from
 * first request, so they are still fast without inflating every build.
 */
export async function prerenderAreaSlugs(): Promise<{ slug: string; kind: 'locality' | 'zone' }[]> {
  const all = await getLocalities();
  return [
    ...all.filter((l) => l.tier <= 2).map((l) => ({ slug: l.slug, kind: 'locality' as const })),
    ...CHENNAI_ZONES.map((z) => ({ slug: z.slug, kind: 'zone' as const })),
  ];
}

export async function allAreaSlugs(): Promise<{ slug: string; kind: 'locality' | 'zone' }[]> {
  const all = await getLocalities();
  return [
    ...all.map((l) => ({ slug: l.slug, kind: 'locality' as const })),
    ...CHENNAI_ZONES.map((z) => ({ slug: z.slug, kind: 'zone' as const })),
  ];
}
