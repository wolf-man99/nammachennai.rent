import { db, eq } from '@/lib/db';
import { CHENNAI_LOCALITIES, CHENNAI_ZONES, type ZoneSeed } from '@/data/localities';
import { CITY } from '@/lib/constants';
import { haversineKm } from '@/lib/geo';
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
  if (missing.length) {
    await store.insertMany(
      'localities',
      missing.map((l) => ({ ...l, city: CITY })),
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

export async function getLocalities(): Promise<Locality[]> {
  await ensureOnce();
  const rows = await db().find<Locality>('localities', { where: [eq('city', CITY)] });
  return rows.sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
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

export async function allAreaSlugs(): Promise<{ slug: string; kind: 'locality' | 'zone' }[]> {
  const all = await getLocalities();
  return [
    ...all.map((l) => ({ slug: l.slug, kind: 'locality' as const })),
    ...CHENNAI_ZONES.map((z) => ({ slug: z.slug, kind: 'zone' as const })),
  ];
}
